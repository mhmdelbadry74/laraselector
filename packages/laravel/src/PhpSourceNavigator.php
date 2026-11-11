<?php
namespace LaraSelector;

use Illuminate\Http\Request;
use Illuminate\Routing\Route;

final class PhpSourceNavigator
{
    public function page(Request $request): ?array { return $this->fromRoute($request->route()); }
    public function form(Request $request, array $form): ?array
    {
        $url = (string) ($form['url'] ?? ''); $method = strtoupper((string) ($form['method'] ?? ''));
        if (!in_array($method, ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], true) || !$this->sameOriginUrl($request, $url)) return null;
        $parts = parse_url($url ?: $request->fullUrl()); if ($parts === false) return null;
        $path = ($parts['path'] ?? '/') . (isset($parts['query']) ? '?'.$parts['query'] : '');
        try { $synthetic = Request::create($path, $method); $route = app('router')->getRoutes()->match($synthetic); }
        catch (\Throwable) { return null; }
        return $this->fromRoute($route);
    }
    private function sameOriginUrl(Request $request, string $url): bool
    {
        if ($url === '') return true; $p = parse_url($url); if ($p === false) return false;
        if (!isset($p['host'])) return !str_starts_with($url, '//');
        return strtolower(($p['scheme'] ?? $request->getScheme()).'://'.$p['host'].(isset($p['port']) ? ':'.$p['port'] : '')) === strtolower($request->getSchemeAndHttpHost());
    }
    private function fromRoute(?Route $route): ?array
    {
        if (!$route) return null; $uses = $route->getAction('uses');
        try {
            if ($uses instanceof \Closure) $ref = new \ReflectionFunction($uses);
            else { $name = is_string($uses) ? $uses : $route->getActionName(); if (!is_string($name) || !str_contains($name, '@')) return null; [$class,$method] = explode('@',$name,2); $ref = new \ReflectionMethod($class, $method ?: '__invoke'); }
            $file = $ref->getFileName(); if (!$file || !$this->allowed($file)) return null;
            return ['path'=>$file,'relative'=>$this->relative($file),'line'=>$ref->getStartLine()];
        } catch (\Throwable) { return null; }
    }
    private function allowed(string $file): bool { $real = realpath($file); if (!$real) return false; foreach ((array) config('laraselector.php_inspect_paths', [app_path(), base_path('routes')]) as $dir) { $root=realpath($dir); if ($root && ($real===$root || str_starts_with($real,$root.DIRECTORY_SEPARATOR))) return true; } return false; }
    private function relative(string $file): string { $root=rtrim((string)config('laraselector.application_root',base_path()),'/'); return ltrim(substr($file,strlen($root)),'/'); }
}
