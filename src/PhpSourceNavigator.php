<?php

namespace LaraSelector;

use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Livewire\LivewireComponentsFinder;
use Livewire\Mechanisms\ComponentRegistry;

final class PhpSourceNavigator
{
    public function page(Request $request, string $url): ?array
    {
        if (! $this->sameOriginUrl($request, $url)) {
            return null;
        }

        return $this->fromUrl($url, 'GET');
    }

    public function form(Request $request, array $form): ?array
    {
        $url = (string) ($form['url'] ?? '');
        $method = strtoupper((string) ($form['method'] ?? ''));
        if (! in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true) || ! $this->sameOriginUrl($request, $url)) {
            return null;
        }

        return $this->fromUrl($url ?: $request->fullUrl(), $method);
    }

    public function pageRoute(Request $request, string $url): ?Route
    {
        return $this->sameOriginUrl($request, $url) ? $this->matchRoute($url ?: $request->fullUrl(), 'GET') : null;
    }

    public function formRoute(Request $request, array $form): ?Route
    {
        $url = (string) ($form['url'] ?? '');
        $method = strtoupper((string) ($form['method'] ?? ''));
        if (! in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], true) || ! $this->sameOriginUrl($request, $url)) {
            return null;
        }

        return $this->matchRoute($url ?: $request->fullUrl(), $method);
    }

    /**
     * Resolve a Livewire component class (and optionally one of its public methods).
     * The component name and action come from the browser, so they are validated,
     * resolved only through Livewire's own registry and checked against php_inspect_paths.
     *
     * @return array{component?: array, action?: array, render?: array}
     */
    public function livewire(array $info): array
    {
        $name = (string) ($info['component'] ?? '');
        $action = (string) ($info['action'] ?? '');
        if ($name === '' || strlen($name) > 200 || preg_match('/^[A-Za-z0-9._:\\-]+$/', $name) !== 1) {
            return [];
        }
        $class = $this->livewireClass($name);
        if (! $class || ! class_exists($class) || ! is_subclass_of($class, 'Livewire\\Component')) {
            return [];
        }
        $out = [];
        try {
            $ref = new \ReflectionClass($class);
            $file = $ref->getFileName();
            if (! $file || ! $this->allowed($file)) {
                return [];
            }
            $out['component'] = ['path' => $file, 'relative' => $this->relative($file), 'line' => $ref->getStartLine()];
            if ($ref->hasMethod('render')) {
                $r = $ref->getMethod('render');
                $rf = $r->getFileName();
                if ($rf && $this->allowed($rf)) {
                    $out['render'] = ['path' => $rf, 'relative' => $this->relative($rf), 'line' => $r->getStartLine()];
                }
            }
            if (preg_match('/^[A-Za-z_]\w*$/', $action) === 1 && $ref->hasMethod($action)) {
                $m = $ref->getMethod($action);
                $mf = $m->getFileName();
                if ($m->isPublic() && $mf && $this->allowed($mf)) {
                    $out['action'] = ['path' => $mf, 'relative' => $this->relative($mf), 'line' => $m->getStartLine()];
                }
            }
        } catch (\Throwable) {
            return [];
        }

        return $out;
    }

    private function livewireClass(string $name): ?string
    {
        $resolvers = [
            // Livewire 3
            fn () => app(ComponentRegistry::class)->getClass($name),
            // Livewire 4
            fn () => app('livewire.finder')->resolveClassComponentClassName($name),
            // Livewire 2
            fn () => app(LivewireComponentsFinder::class)->find($name),
        ];
        foreach ($resolvers as $resolve) {
            try {
                $class = $resolve();
                if (is_string($class) && $class !== '') {
                    return $class;
                }
            } catch (\Throwable) {
            }
        }

        return null;
    }

    private function fromUrl(string $url, string $method): ?array
    {
        return $this->fromRoute($this->matchRoute($url, $method));
    }

    public function matchRoute(string $url, string $method): ?Route
    {
        $parts = parse_url($url);
        if ($parts === false) {
            return null;
        }
        $path = ($parts['path'] ?? '/').(isset($parts['query']) ? '?'.$parts['query'] : '');
        try {
            return app('router')->getRoutes()->match(Request::create($path, $method));
        } catch (\Throwable) {
            return null;
        }
    }

    /** Build a source location for a file found by a server-side scan, if it is inside the project. */
    public function locate(string $file, int $line): ?array
    {
        $real = realpath($file);
        $root = realpath((string) config('laraselector.application_root', base_path()));
        if (! $real || ! $root || ! str_starts_with($real, $root.DIRECTORY_SEPARATOR)) {
            return null;
        }

        return ['path' => $real, 'relative' => ltrim(substr($real, strlen($root)), DIRECTORY_SEPARATOR), 'line' => max(1, $line)];
    }

    /** Like locate(), but only for files in php_inspect_paths. */
    public function locatePhp(string $file, int $line): ?array
    {
        return $this->allowed($file) ? $this->locate($file, $line) : null;
    }

    private function sameOriginUrl(Request $request, string $url): bool
    {
        if ($url === '') {
            return true;
        } $p = parse_url($url);
        if ($p === false) {
            return false;
        }
        if (! isset($p['host'])) {
            return ! str_starts_with($url, '//');
        }

        return strtolower(($p['scheme'] ?? $request->getScheme()).'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : '')) === strtolower($request->getSchemeAndHttpHost());
    }

    private function fromRoute(?Route $route): ?array
    {
        if (! $route) {
            return null;
        } $uses = $route->getAction('uses');
        try {
            if ($uses instanceof \Closure) {
                $ref = new \ReflectionFunction($uses);
            } else {
                $name = is_string($uses) ? $uses : $route->getActionName();
                if (! is_string($name) || ! str_contains($name, '@')) {
                    return null;
                } [$class,$method] = explode('@', $name, 2);
                $ref = new \ReflectionMethod($class, $method ?: '__invoke');
            }
            $file = $ref->getFileName();
            if (! $file || ! $this->allowed($file)) {
                return null;
            }

            return ['path' => $file, 'relative' => $this->relative($file), 'line' => $ref->getStartLine()];
        } catch (\Throwable) {
            return null;
        }
    }

    private function allowed(string $file): bool
    {
        $real = realpath($file);
        if (! $real) {
            return false;
        } foreach ((array) config('laraselector.php_inspect_paths', [app_path(), base_path('routes')]) as $dir) {
            $root = realpath($dir);
            if ($root && ($real === $root || str_starts_with($real, $root.DIRECTORY_SEPARATOR))) {
                return true;
            }
        }

        return false;
    }

    private function relative(string $file): string
    {
        $root = rtrim((string) config('laraselector.application_root', base_path()), '/');

        return ltrim(substr($file, strlen($root)), '/');
    }
}
