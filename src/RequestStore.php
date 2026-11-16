<?php

namespace LaraSelector;

/** Keeps the latest rendered-request snapshots on disk so the extension can ask about them. */
final class RequestStore
{
    public static function valid(string $id): bool
    {
        return preg_match('/^[a-f0-9]{16}$/', $id) === 1;
    }

    public function save(string $id, array $payload): void
    {
        if (! self::valid($id)) {
            return;
        }
        $dir = $this->dir();
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        @file_put_contents($dir.'/'.$id.'.json', json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR));
        $this->prune($dir);
    }

    public function load(string $id): ?array
    {
        if (! self::valid($id)) {
            return null;
        }
        $file = $this->dir().'/'.$id.'.json';
        $data = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;

        return is_array($data) ? $data : null;
    }

    public function dir(): string
    {
        return storage_path('framework/laraselector');
    }

    private function prune(string $dir): void
    {
        $files = glob($dir.'/*.json') ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        foreach (array_slice($files, 30) as $old) {
            @unlink($old);
        }
        foreach ($files as $f) {
            if (filemtime($f) < time() - 3600) {
                @unlink($f);
            }
        }
    }
}
