<?php

namespace LaraSelector\Support;

/** Finds where a piece of rendered text is defined in lang/ files (PHP arrays and JSON). */
final class TranslationFinder
{
    public static function paths(): array
    {
        $paths = [];
        foreach ((array) config('laraselector.lang_paths', []) as $p) {
            if (($real = realpath($p)) && ! in_array($real, $paths, true)) {
                $paths[] = $real;
            }
        }

        return $paths;
    }

    public static function normalize(string $s): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $s));
    }

    /** @return list<array{locale: string, key: string, value: string, path: string, line: int, format: string}> */
    public function find(string $text, int $limit = 10): array
    {
        $needle = self::normalize($text);
        if ($needle === '' || mb_strlen($needle) > 300) {
            return [];
        }

        $found = [];
        foreach (self::paths() as $root) {
            foreach ($this->files($root) as $file) {
                $locale = $this->locale($root, $file);
                $isJson = str_ends_with($file, '.json');
                $flat = $isJson ? $this->json($file) : $this->php($file, $root);
                foreach ($flat as $key => $value) {
                    if (! is_string($value) || (self::normalize($value) !== $needle && ! ($isJson && self::normalize((string) $key) === $needle))) {
                        continue;
                    }
                    $found[] = [
                        'locale' => $locale, 'key' => (string) $key, 'value' => $value, 'path' => $file,
                        'line' => $this->line($file, $isJson ? (string) $key : (string) $key, $value), 'format' => $isJson ? 'json' : 'php',
                    ];
                    if (count($found) >= $limit) {
                        return $found;
                    }
                }
            }
        }

        return $found;
    }

    /** @return list<string> */
    private function files(string $root): array
    {
        $files = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            $path = $f->getPathname();
            if (! str_contains($path, DIRECTORY_SEPARATOR.'vendor'.DIRECTORY_SEPARATOR) && in_array($f->getExtension(), ['php', 'json'], true) && $f->getSize() < 1_000_000) {
                $files[] = $path;
            }
            if (count($files) > 400) {
                break;
            }
        }
        sort($files);

        return $files;
    }

    private function locale(string $root, string $file): string
    {
        $rel = ltrim(substr($file, strlen($root)), DIRECTORY_SEPARATOR);

        return str_ends_with($file, '.json') ? basename($file, '.json') : (explode(DIRECTORY_SEPARATOR, $rel)[0] ?? '');
    }

    private function json(string $file): array
    {
        $data = json_decode((string) @file_get_contents($file), true);

        return is_array($data) ? $data : [];
    }

    private function php(string $file, string $root): array
    {
        try {
            $data = (static fn () => include $file)();
        } catch (\Throwable) {
            return [];
        }

        return is_array($data) ? $this->flatten($data, basename($file, '.php').'.') : [];
    }

    private function flatten(array $a, string $prefix): array
    {
        $out = [];
        foreach ($a as $k => $v) {
            is_array($v) ? $out += $this->flatten($v, $prefix.$k.'.') : $out[$prefix.$k] = $v;
        }

        return $out;
    }

    private function line(string $file, string $key, string $value): int
    {
        $lines = @file($file, FILE_IGNORE_NEW_LINES) ?: [];
        $last = str_contains($key, '.') && ! str_ends_with($file, '.json') ? substr($key, (int) strrpos($key, '.') + 1) : $key;
        $fallback = 1;
        foreach ($lines as $i => $line) {
            if (str_contains($line, $last) && str_contains($line, $value)) {
                return $i + 1;
            }
            if ($fallback === 1 && str_contains($line, $value)) {
                $fallback = $i + 1;
            }
        }

        return $fallback;
    }
}
