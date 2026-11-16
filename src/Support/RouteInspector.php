<?php

namespace LaraSelector\Support;

use Illuminate\Routing\Route;
use LaraSelector\PhpSourceNavigator;

final class RouteInspector
{
    public function __construct(private PhpSourceNavigator $php) {}

    /** @return array<string, mixed> */
    public function describe(Route $route): array
    {
        $middleware = [];
        try {
            foreach ($route->gatherMiddleware() as $m) {
                $middleware[] = is_string($m) ? $m : 'Closure';
            }
        } catch (\Throwable) {
        }

        return [
            'name' => $route->getName(),
            'uri' => '/'.ltrim($route->uri(), '/'),
            'methods' => array_values(array_diff($route->methods(), ['HEAD'])),
            'domain' => $route->getDomain(),
            'action' => $route->getActionName() === 'Closure' ? 'Closure' : $route->getActionName(),
            'middleware' => $middleware,
            'parameters' => $this->parameters($route),
            'formRequests' => $this->formRequests($route),
        ];
    }

    private function parameters(Route $route): array
    {
        try {
            return DataPreview::one($route->parameters());
        } catch (\Throwable) {
            return [];
        }
    }

    /** @return list<array{class: string, rules: ?array, path: ?string, line: ?int, file: ?string}> */
    private function formRequests(Route $route): array
    {
        $uses = $route->getAction('uses');
        try {
            if ($uses instanceof \Closure) {
                $ref = new \ReflectionFunction($uses);
            } else {
                $name = $route->getActionName();
                if (! str_contains($name, '@')) {
                    $ref = new \ReflectionMethod($name, '__invoke');
                } else {
                    [$class, $method] = explode('@', $name, 2);
                    $ref = new \ReflectionMethod($class, $method);
                }
            }
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($ref->getParameters() as $param) {
            $type = $param->getType();
            if (! $type instanceof \ReflectionNamedType || $type->isBuiltin() || ! is_subclass_of($type->getName(), 'Illuminate\\Foundation\\Http\\FormRequest')) {
                continue;
            }
            $class = $type->getName();
            $r = new \ReflectionClass($class);
            $located = ($file = $r->getFileName()) ? $this->php->locatePhp($file, $r->getStartLine()) : null;
            $out[] = ['class' => $class, 'rules' => $this->rules($r), 'source' => $located];
        }

        return $out;
    }

    private function rules(\ReflectionClass $r): ?array
    {
        if (! $r->hasMethod('rules')) {
            return null;
        }
        try {
            $rules = $r->newInstanceWithoutConstructor()->rules();
        } catch (\Throwable) {
            return null;
        }
        $out = [];
        foreach (array_slice((array) $rules, 0, 60, true) as $field => $rule) {
            $out[(string) $field] = array_map(
                fn ($x) => is_string($x) ? $x : ($x instanceof \Stringable ? (string) $x : (is_object($x) ? class_basename($x) : json_encode($x))),
                is_array($rule) ? $rule : explode('|', (string) $rule),
            );
        }

        return $out;
    }
}
