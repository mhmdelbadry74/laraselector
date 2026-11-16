<?php

namespace LaraSelector\Support;

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Enumerable;

/** Turns view data into a small, JSON-safe, secret-redacted preview. */
final class DataPreview
{
    private const HIDDEN = ['__env', 'app', 'obLevel', '__data', '__path', 'this'];

    private const SECRET = '/pass(word)?|secret|token|api[_-]?key|authorization|cookie|csrf|private|credential|otp/i';

    private int $nodes = 0;

    public static function variables(array $vars): array
    {
        $self = new self;
        $out = [];
        foreach ($vars as $name => $value) {
            $name = (string) $name;
            if (in_array($name, self::HIDDEN, true) || str_starts_with($name, '__') || str_starts_with($name, '_')) {
                continue;
            }
            if ($name === 'errors' && is_object($value) && method_exists($value, 'any') && ! $value->any()) {
                continue;
            }
            $out[$name] = preg_match(self::SECRET, $name) === 1 ? '••• redacted' : $self->value($value, 0);
        }

        return $out;
    }

    public static function one(mixed $value): mixed
    {
        return (new self)->value($value, 0);
    }

    private function value(mixed $v, int $depth): mixed
    {
        if (++$this->nodes > 600) {
            return '…';
        }
        if ($v === null || is_bool($v) || is_int($v)) {
            return $v;
        }
        if (is_float($v)) {
            return is_finite($v) ? $v : (string) $v;
        }
        if (is_string($v)) {
            return $this->string($v);
        }
        if (is_array($v)) {
            return $this->array($v, $depth);
        }
        if ($v instanceof \Closure) {
            return '(closure)';
        }
        if ($v instanceof \UnitEnum) {
            return ['_class' => $v::class, '_case' => $v->name] + ($v instanceof \BackedEnum ? ['_value' => $v->value] : []);
        }
        if ($v instanceof \DateTimeInterface) {
            return $v->format(\DateTimeInterface::ATOM);
        }
        if (is_resource($v)) {
            return '(resource)';
        }
        if (! is_object($v)) {
            return '(unknown)';
        }
        if ($depth >= 3) {
            return '('.class_basename($v).')';
        }
        if ($v instanceof Model) {
            $out = ['_class' => $v::class, '_attributes' => $this->array($v->getAttributes(), $depth + 1)];
            if ($v->getRelations()) {
                $out['_relations'] = array_map(fn ($r) => $this->value($r, $depth + 2), $v->getRelations());
            }

            return $out;
        }
        if ($v instanceof AbstractPaginator) {
            return ['_class' => $v::class, '_total_on_page' => count($v->items()), '_items' => $this->array(array_slice($v->items(), 0, 10), $depth + 1)];
        }
        if ($v instanceof Enumerable) {
            return ['_class' => $v::class, '_count' => $v->count(), '_items' => $this->array($v->take(10)->all(), $depth + 1)];
        }
        if ($v instanceof Htmlable) {
            return $this->safeString(fn () => $v->toHtml(), $v);
        }
        if ($v instanceof \Stringable) {
            return $this->safeString(fn () => (string) $v, $v);
        }
        if ($v instanceof Arrayable) {
            try {
                return ['_class' => $v::class] + $this->array($v->toArray(), $depth + 1);
            } catch (\Throwable) {
                return ['_class' => $v::class];
            }
        }

        return ['_class' => $v::class] + $this->array(get_object_vars($v), $depth + 1);
    }

    /** Casting arbitrary objects can warn or throw (e.g. Blade's InvokableComponentVariable). */
    private function safeString(\Closure $cast, object $v): string
    {
        try {
            return $this->string((string) $cast());
        } catch (\Throwable) {
            return '('.class_basename($v).')';
        }
    }

    private function array(array $a, int $depth): array
    {
        if ($depth >= 4) {
            return ['…' => 'array('.count($a).')'];
        }
        $out = [];
        $i = 0;
        foreach ($a as $k => $item) {
            if (++$i > 25) {
                $out['…'] = '+'.(count($a) - 25).' more';
                break;
            }
            $out[$k] = is_string($k) && preg_match(self::SECRET, $k) === 1 ? '••• redacted' : $this->value($item, $depth + 1);
        }

        return $out;
    }

    private function string(string $s): string
    {
        if (! mb_check_encoding($s, 'UTF-8')) {
            return '(binary '.strlen($s).' bytes)';
        }

        return mb_strlen($s) > 200 ? mb_substr($s, 0, 200).'…' : $s;
    }
}
