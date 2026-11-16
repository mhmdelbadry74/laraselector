<?php

namespace LaraSelector;

use Illuminate\Database\Events\QueryExecuted;
use LaraSelector\Support\DataPreview;

/**
 * Records, per request, which Blade files rendered (nesting, timing, data) and which
 * queries ran while each of them was the innermost view. Fed by code the instrumenting
 * Blade compiler adds to compiled views and by the QueryExecuted event.
 */
final class RenderRecorder
{
    public ?string $requestId = null;

    /** @var array<int, array<string, mixed>> */
    private array $renders = [];

    /** @var list<int> */
    private array $stack = [];

    /** @var list<array{sql: string, ms: float, render: ?int}> */
    private array $queries = [];

    public static function begin(string $path, array $vars): int
    {
        $app = app();
        if (! $app->bound(self::class) || ! $app[Activation::class]->active()) {
            return -1;
        }

        return $app[self::class]->start($path, $vars);
    }

    public static function end(int $index): void
    {
        if ($index >= 0) {
            app(self::class)->finish($index);
        }
    }

    public function reset(): void
    {
        $this->renders = [];
        $this->stack = [];
        $this->queries = [];
        $this->requestId = null;
    }

    public function start(string $path, array $vars): int
    {
        if (count($this->renders) >= (int) config('laraselector.max_renders', 400)) {
            return -1;
        }
        $i = count($this->renders);
        try {
            $data = DataPreview::variables($vars);
        } catch (\Throwable) {
            $data = [];   // the inspector must never break a page render
        }
        $this->renders[$i] = [
            'path' => $path,
            'parent' => $this->stack ? end($this->stack) : null,
            'data' => $data,
            'queries' => [],
            'start' => hrtime(true),
            'ms' => 0.0,
            'child' => 0.0,
        ];
        $this->stack[] = $i;

        return $i;
    }

    public function finish(int $i): void
    {
        if (! isset($this->renders[$i]) || ! in_array($i, $this->stack, true)) {
            return;
        }
        while ($this->stack && ($top = array_pop($this->stack)) !== $i) {
            // A view above this one was left by an exception: close it implicitly.
            $this->close($top);
        }
        $this->close($i);
    }

    public function query(QueryExecuted $q): void
    {
        $render = $this->stack ? end($this->stack) : null;
        $this->queries[] = ['sql' => $q->sql, 'ms' => round($q->time, 2), 'render' => $render];
        if ($render !== null && count($this->renders[$render]['queries']) < 200) {
            $this->renders[$render]['queries'][] = [
                'sql' => $q->sql,
                'bindings' => DataPreview::one(array_slice($q->bindings, 0, 10)),
                'ms' => round($q->time, 2),
            ];
        }
    }

    public function hasData(): bool
    {
        return $this->renders !== [] || $this->queries !== [];
    }

    /** @return array<string, mixed> */
    public function export(): array
    {
        $renders = [];
        foreach ($this->renders as $i => $r) {
            $renders[$i] = [
                'path' => $r['path'],
                'parent' => $r['parent'],
                'ms' => round($r['ms'], 2),
                'self' => round(max(0.0, $r['ms'] - $r['child']), 2),
                'data' => $r['data'],
                'queries' => $this->group($r['queries']),
            ];
        }

        $threshold = max(2, (int) config('laraselector.nplus1_threshold', 3));
        $groups = [];
        foreach ($this->queries as $q) {
            $g = &$groups[$q['sql']];
            $g['sql'] = $q['sql'];
            $g['count'] = ($g['count'] ?? 0) + 1;
            $g['ms'] = round(($g['ms'] ?? 0) + $q['ms'], 2);
            if ($q['render'] !== null) {
                $g['views'][$this->renders[$q['render']]['path']] = true;
            }
            unset($g);
        }
        $repeated = [];
        foreach ($groups as $g) {
            if ($g['count'] >= $threshold) {
                $repeated[] = ['sql' => $g['sql'], 'count' => $g['count'], 'ms' => $g['ms'], 'views' => array_keys($g['views'] ?? [])];
            }
        }
        usort($repeated, fn ($a, $b) => $b['count'] <=> $a['count']);

        return [
            'id' => $this->requestId,
            'renders' => $renders,
            'queryCount' => count($this->queries),
            'queryMs' => round(array_sum(array_column($this->queries, 'ms')), 2),
            'nplus1' => $repeated,
        ];
    }

    private function close(int $i): void
    {
        $ms = (hrtime(true) - $this->renders[$i]['start']) / 1e6;
        $this->renders[$i]['ms'] = $ms;
        if (($p = $this->renders[$i]['parent']) !== null && isset($this->renders[$p])) {
            $this->renders[$p]['child'] += $ms;
        }
    }

    /** @param list<array{sql: string, bindings: mixed, ms: float}> $queries */
    private function group(array $queries): array
    {
        $out = [];
        foreach ($queries as $q) {
            $k = $q['sql'];
            if (! isset($out[$k])) {
                $out[$k] = ['sql' => $q['sql'], 'bindings' => $q['bindings'], 'count' => 0, 'ms' => 0.0];
            }
            $out[$k]['count']++;
            $out[$k]['ms'] = round($out[$k]['ms'] + $q['ms'], 2);
        }

        return array_values($out);
    }
}
