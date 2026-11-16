<?php

namespace LaraSelector\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LaraSelector\Activation;
use LaraSelector\LaraSelectorToken;
use LaraSelector\PhpSourceNavigator;
use LaraSelector\RequestStore;
use LaraSelector\Support\CssFinder;
use LaraSelector\Support\EditException;
use LaraSelector\Support\EditorLinks;
use LaraSelector\Support\RouteInspector;
use LaraSelector\Support\SourceEditor;
use LaraSelector\Support\TranslationFinder;

final class LaraSelectorController extends Controller
{
    private ?string $hostRoot = null;

    public function capabilities(Request $request)
    {
        $this->gate();

        return response()->json([
            'protocol' => 3,
            'capabilities' => ['resolve', 'editor-uri', 'page-controller', 'form-action', 'livewire', 'inspect', 'page', 'translations', 'css', 'inertia', 'edit'],
            'editing' => (bool) config('laraselector.editing'),
            'editor' => (string) config('laraselector.editor', 'vscode'),
            'container' => is_file('/.dockerenv') && (array) config('laraselector.path_mapping', []) === [],
        ]);
    }

    public function handshake(Request $request)
    {
        $this->gate();

        if (! $this->sameOrigin($request)) {
            return $this->error('origin_denied', 403);
        }

        $token = bin2hex(random_bytes(24));
        session(['laraselector_token' => $token]);

        return response()->json(['ok' => true])->header('X-LaraSelector-Token', $token);
    }

    public function resolve(Request $request, LaraSelectorToken $tokens, PhpSourceNavigator $php)
    {
        $this->gate();

        if ($denied = $this->deny($request)) {
            return $denied;
        }

        try {
            $blade = $tokens->resolve((string) $request->input('id'));
        } catch (\InvalidArgumentException $e) {
            return $this->error('invalid_source', 422, $e->getMessage());
        }

        $targets = ['blade' => $this->target($blade)];

        if ($page = $php->page($request, (string) $request->input('page'))) {
            $targets['pageController'] = $this->target($page);
        }

        $form = $request->input('form');

        if (is_array($form) && ($action = $php->form($request, $form))) {
            $targets['formAction'] = $this->target($action);
        }

        $livewire = $request->input('livewire');

        if (is_array($livewire)) {
            $found = $php->livewire($livewire);
            if (isset($found['action'])) {
                $targets['livewireAction'] = $this->target($found['action']);
            }
            if (! isset($found['action']) && ($volt = $this->voltAction($blade, (string) ($livewire['action'] ?? '')))) {
                $targets['livewireAction'] = $this->target($volt);
            }
            if (isset($found['component'])) {
                $targets['livewireComponent'] = $this->target($found['component']);
            }
            if (isset($found['render'])) {
                $targets['livewireRender'] = $this->target($found['render']);
            }
        }

        return response()->json([
            'source' => $targets['blade']['source'],
            'editorUri' => $targets['blade']['editorUri'],
            'targets' => $targets,
        ]);
    }

    /** Everything the extension shows in its details panel for one selected element. */
    public function inspect(Request $request, LaraSelectorToken $tokens, PhpSourceNavigator $php, RequestStore $store, RouteInspector $routes, TranslationFinder $translations, CssFinder $css)
    {
        $this->gate();

        if ($denied = $this->deny($request)) {
            return $denied;
        }

        try {
            $blade = $tokens->resolve((string) $request->input('id'));
        } catch (\InvalidArgumentException $e) {
            return $this->error('invalid_source', 422, $e->getMessage());
        }

        $out = ['source' => $this->target($blade)['source'], 'view' => null, 'nplus1' => [], 'route' => null, 'formRoute' => null, 'translations' => [], 'css' => null];

        if ($snap = $store->load((string) $request->input('request'))) {
            $out = array_merge($out, $this->viewInfo($snap, $blade['relative'], $php));
        }

        if (($route = $php->pageRoute($request, (string) $request->input('page'))) !== null) {
            $out['route'] = $this->routeInfo($routes->describe($route), $php->page($request, (string) $request->input('page')));
        }

        $form = $request->input('form');
        if (is_array($form) && ($route = $php->formRoute($request, $form)) !== null) {
            $out['formRoute'] = $this->routeInfo($routes->describe($route), $php->form($request, $form));
        }

        $text = $request->input('text');
        if (is_string($text) && $text !== '') {
            foreach ($translations->find($text) as $t) {
                if ($loc = $php->locate($t['path'], $t['line'])) {
                    $out['translations'][] = ['locale' => $t['locale'], 'key' => $t['key'], 'value' => $t['value'], 'format' => $t['format']] + $this->target($loc);
                }
            }
        }

        $classes = $request->input('classes');
        if (is_array($classes) && $classes !== []) {
            $items = [];
            foreach ($css->find(array_map('strval', $classes)) as $c) {
                $c['matches'] = array_values(array_filter(array_map(function ($m) use ($php) {
                    $loc = $php->locate($m['path'], $m['line']);

                    return $loc ? ['text' => $m['text']] + $this->target($loc) : null;
                }, $c['matches'])));
                $c['utility'] = $c['matches'] === [];
                $items[] = $c;
            }
            $tw = ($f = $css->tailwindConfig()) ? $php->locate($f, 1) : null;
            $out['css'] = ['classes' => $items, 'tailwindConfig' => $tw ? $this->target($tw) : null];
        }

        return response()->json($out);
    }

    /** Page-level information: route, per-view timings (heatmap), query totals, Inertia page. */
    public function page(Request $request, PhpSourceNavigator $php, RequestStore $store, RouteInspector $routes)
    {
        $this->gate();

        if ($denied = $this->deny($request)) {
            return $denied;
        }

        $out = ['route' => null, 'views' => [], 'totals' => null, 'nplus1' => [], 'inertia' => null];

        if (($route = $php->pageRoute($request, (string) $request->input('page'))) !== null) {
            $out['route'] = $this->routeInfo($routes->describe($route), $php->page($request, (string) $request->input('page')));
        }

        if ($snap = $store->load((string) $request->input('request'))) {
            $views = [];
            foreach ($snap['renders'] ?? [] as $r) {
                $v = &$views[$r['path']];
                $v['path'] = $r['path'];
                $v['count'] = ($v['count'] ?? 0) + 1;
                $v['ms'] = round(($v['ms'] ?? 0) + $r['ms'], 2);
                $v['self'] = round(($v['self'] ?? 0) + $r['self'], 2);
                $v['queries'] = ($v['queries'] ?? 0) + array_sum(array_column($r['queries'], 'count'));
                unset($v);
            }
            $root = (string) realpath((string) config('laraselector.application_root'));
            foreach ($views as &$v) {
                $v += ($loc = $php->locate($root.'/'.$v['path'], 1)) ? $this->target($loc) : [];
            }
            unset($v);
            $out['views'] = array_values($views);
            $out['totals'] = ['queries' => $snap['queryCount'] ?? 0, 'queryMs' => $snap['queryMs'] ?? 0, 'renders' => count($snap['renders'] ?? [])];
            $out['nplus1'] = $snap['nplus1'] ?? [];
        }

        $inertia = $request->input('inertia');
        if (is_array($inertia) && ($component = $this->inertiaPage((string) ($inertia['component'] ?? ''), $php))) {
            $out['inertia'] = $component;
        }

        return response()->json($out);
    }

    public function edit(Request $request, LaraSelectorToken $tokens, SourceEditor $editor)
    {
        $this->gate();

        if ($denied = $this->deny($request)) {
            return $denied;
        }
        if (! config('laraselector.editing')) {
            return $this->error('editing_disabled', 403, 'Editing is off. Set LARASELECTOR_EDITING=true in .env to allow it.');
        }

        try {
            $result = match ((string) $request->input('kind')) {
                'text' => $editor->text($tokens->resolve((string) $request->input('id')), (string) $request->input('old'), (string) $request->input('new')),
                'class' => $editor->classes($tokens->resolve((string) $request->input('id')), (string) $request->input('tag'), (string) $request->input('old'), (string) $request->input('new')),
                'translation' => $editor->translation((string) $request->input('path'), (int) $request->input('line'), (string) $request->input('old'), (string) $request->input('new'), (string) realpath((string) config('laraselector.application_root'))),
                default => throw new EditException('Unknown edit kind.'),
            };
        } catch (\InvalidArgumentException $e) {
            return $this->error('invalid_source', 422, $e->getMessage());
        } catch (EditException $e) {
            return $this->error('edit_failed', 422, $e->getMessage());
        }

        return response()->json(['ok' => true] + $result);
    }

    public function undo(Request $request, SourceEditor $editor)
    {
        $this->gate();

        if ($denied = $this->deny($request)) {
            return $denied;
        }
        if (! config('laraselector.editing')) {
            return $this->error('editing_disabled', 403, 'Editing is off.');
        }

        try {
            return response()->json(['ok' => true] + $editor->undo((string) $request->input('undo')));
        } catch (EditException $e) {
            return $this->error('undo_failed', 422, $e->getMessage());
        }
    }

    private function viewInfo(array $snap, string $relative, PhpSourceNavigator $php): array
    {
        $renders = $snap['renders'] ?? [];
        $mine = array_filter($renders, fn ($r) => $r['path'] === $relative);
        $out = ['view' => null, 'nplus1' => array_values(array_filter($snap['nplus1'] ?? [], fn ($g) => in_array($relative, $g['views'] ?? [], true)))];
        if (! $mine) {
            return $out;
        }

        $chain = [];
        for ($i = array_key_first($mine), $guard = 0; $i !== null && isset($renders[$i]) && $guard++ < 30; $i = $renders[$i]['parent']) {
            $chain[] = ['path' => $renders[$i]['path'], 'ms' => $renders[$i]['ms'], 'self' => $renders[$i]['self']]
                + (($loc = $php->locate((string) realpath(config('laraselector.application_root')).'/'.$renders[$i]['path'], 1)) ? $this->target($loc) : []);
        }

        $out['view'] = [
            'path' => $relative,
            'count' => count($mine),
            'ms' => round(array_sum(array_column($mine, 'ms')), 2),
            'self' => round(array_sum(array_column($mine, 'self')), 2),
            'renders' => array_map(fn ($r) => ['ms' => $r['ms'], 'self' => $r['self'], 'data' => $r['data'], 'queries' => $r['queries']], array_slice(array_values($mine), 0, 20)),
            'chain' => array_reverse($chain),
        ];

        return $out;
    }

    private function routeInfo(array $route, ?array $source): array
    {
        $route['target'] = $source ? $this->target($source) : null;
        $route['formRequests'] = array_map(function ($fr) {
            $fr['target'] = ! empty($fr['source']) ? $this->target($fr['source']) : null;
            unset($fr['source']);

            return $fr;
        }, $route['formRequests']);

        return $route;
    }

    private function inertiaPage(string $component, PhpSourceNavigator $php): ?array
    {
        if ($component === '' || strlen($component) > 200 || preg_match('#^[A-Za-z0-9_/.\-]+$#', $component) !== 1 || str_contains($component, '..')) {
            return null;
        }
        foreach ((array) config('laraselector.inertia_paths', []) as $dir) {
            foreach (['vue', 'tsx', 'jsx', 'svelte', 'ts', 'js'] as $ext) {
                $file = rtrim($dir, '/').'/'.$component.'.'.$ext;
                if (is_file($file) && ($loc = $php->locate($file, 1))) {
                    return ['component' => $component] + $this->target($loc);
                }
            }
        }

        return null;
    }

    /** Volt components live inside the Blade file itself: find the action function there. */
    private function voltAction(array $blade, string $action): ?array
    {
        if (preg_match('/^[A-Za-z_]\w*$/', $action) !== 1) {
            return null;
        }
        $lines = @file($blade['path'], FILE_IGNORE_NEW_LINES) ?: [];
        if (! str_contains(implode("\n", $lines), 'Livewire\\Volt') && ! str_contains(implode("\n", $lines), '@volt')) {
            return null;
        }
        foreach ($lines as $i => $line) {
            if (preg_match('/function\s+'.$action.'\s*\(|\$'.$action.'\s*=\s*(fn|function)|action\(\s*\$?'.$action.'\b/', $line) === 1) {
                return ['path' => $blade['path'], 'relative' => $blade['relative'], 'line' => $i + 1];
            }
        }

        return null;
    }

    private function target(array $source): array
    {
        return [
            'source' => ['path' => $source['relative'], 'line' => $source['line']],
            'editorUri' => EditorLinks::uri($source['path'], $source['line'], $this->hostRoot),
        ];
    }

    /** Shared guard for every state-changing endpoint: origin + session token (+ optional host path). */
    private function deny(Request $request): ?JsonResponse
    {
        $sent = (string) $request->header('X-LaraSelector-Token');
        $expected = (string) session('laraselector_token');

        // An empty expected token means no handshake happened: never let '' equal ''.
        if (! $this->sameOrigin($request) || $expected === '' || ! hash_equals($expected, $sent)) {
            return $this->error('access_denied', 403);
        }

        $this->hostRoot = EditorLinks::validHostRoot($request->input('host_root'));

        return null;
    }

    private function gate(): void
    {
        if (! app(Activation::class)->active()) {
            abort(404);
        }
    }

    private function sameOrigin(Request $request): bool
    {
        $origin = $request->header('Origin');

        return $origin === null || $origin === $request->getSchemeAndHttpHost();
    }

    private function error(string $code, int $status, ?string $detail = null)
    {
        return response()->json(['error' => ['code' => $code, 'message' => $detail ?: $code]], $status);
    }
}
