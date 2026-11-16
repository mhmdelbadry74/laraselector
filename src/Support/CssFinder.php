<?php

namespace LaraSelector\Support;

/** Finds where CSS classes are defined in the project's own stylesheets. */
final class CssFinder
{
    /** @var list<string>|null */
    private ?array $files = null;

    /**
     * @param  list<string>  $classes
     * @return list<array{class: string, utility: bool, matches: list<array{path: string, line: int, text: string}>}>
     */
    public function find(array $classes): array
    {
        $out = [];
        foreach (array_slice(array_values(array_unique($classes)), 0, 40) as $class) {
            if (! is_string($class) || $class === '' || strlen($class) > 80) {
                continue;
            }
            $matches = [];
            $plain = preg_match('/^-?[A-Za-z_][A-Za-z0-9_-]*$/', $class) === 1;
            if ($plain) {
                $re = '/\.'.preg_quote($class, '/').'(?![A-Za-z0-9_-])/';
                foreach ($this->files() as $file) {
                    foreach (@file($file, FILE_IGNORE_NEW_LINES) ?: [] as $i => $line) {
                        if (preg_match($re, $line) === 1) {
                            $matches[] = ['path' => $file, 'line' => $i + 1, 'text' => trim(mb_substr($line, 0, 120))];
                            if (count($matches) >= 3) {
                                break 2;
                            }
                        }
                    }
                }
            }
            $out[] = ['class' => $class, 'utility' => $matches === [], 'matches' => $matches];
        }

        return $out;
    }

    public function tailwindConfig(): ?string
    {
        $root = rtrim((string) config('laraselector.application_root', base_path()), '/');
        foreach (['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs', 'tailwind.config.mjs'] as $f) {
            if (is_file($root.'/'.$f)) {
                return $root.'/'.$f;
            }
        }

        return null;
    }

    /** @return list<string> */
    private function files(): array
    {
        if ($this->files !== null) {
            return $this->files;
        }
        $this->files = [];
        foreach ((array) config('laraselector.css_paths', []) as $dir) {
            if (! ($real = realpath($dir)) || ! is_dir($real)) {
                continue;
            }
            $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($real, \FilesystemIterator::SKIP_DOTS));
            foreach ($it as $f) {
                if (in_array($f->getExtension(), ['css', 'scss', 'sass', 'less'], true) && $f->getSize() < 1_000_000 && ! str_ends_with($f->getFilename(), '.min.css')) {
                    $this->files[] = $f->getPathname();
                }
                if (count($this->files) >= 300) {
                    break 2;
                }
            }
        }

        return $this->files;
    }
}
