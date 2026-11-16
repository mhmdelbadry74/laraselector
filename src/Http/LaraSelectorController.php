<?php

namespace LaraSelector\Http;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LaraSelector\Activation;
use LaraSelector\LaraSelectorToken;
use LaraSelector\PhpSourceNavigator;

final class LaraSelectorController extends Controller
{
    public function capabilities(Request $request)
    {
        $this->gate();

        return response()->json([
            'protocol' => 2,
            'capabilities' => ['resolve', 'editor-uri', 'page-controller', 'form-action', 'livewire'],
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

        $sent = (string) $request->header('X-LaraSelector-Token');
        $expected = (string) session('laraselector_token');

        // An empty expected token means no handshake happened: never let '' equal ''.
        if (! $this->sameOrigin($request) || $expected === '' || ! hash_equals($expected, $sent)) {
            return $this->error('access_denied', 403);
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
        }

        return response()->json([
            'source' => $targets['blade']['source'],
            'editorUri' => $targets['blade']['editorUri'],
            'targets' => $targets,
        ]);
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
            'editorUri' => $this->editorUri($source['path'], $source['line']),
        ];
    }

    private function editorUri(string $path, int $line): string
    {
        foreach ((array) config('laraselector.path_mapping', []) as $from => $to) {
            if (str_starts_with($path, $from)) {
                $path = $to.substr($path, strlen($from));
                break;
            }
        }

        $editor = (string) config('laraselector.editor', 'vscode');

        if (! in_array($editor, ['vscode', 'cursor', 'phpstorm'], true)) {
            $editor = 'vscode';
        }

        if ($editor === 'phpstorm') {
            return 'phpstorm://open?file='.rawurlencode($path).'&line='.$line;
        }

        return $editor.'://file/'.str_replace('%2F', '/', rawurlencode($path)).':'.$line.':1';
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
