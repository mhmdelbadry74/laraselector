<?php

namespace LaraSelector\Support;

/** Builds "open in editor" URIs. */
final class EditorLinks
{
    public const EDITORS = [
        'vscode', 'vscode-insiders', 'vscodium', 'cursor', 'windsurf', 'zed', 'sublime',
        'phpstorm', 'idea', 'webstorm', 'textmate', 'nova',
    ];

    /** Absolute POSIX or Windows path, no traversal, no control characters. */
    public static function validHostRoot(mixed $root): ?string
    {
        if (! is_string($root) || $root === '' || strlen($root) > 500 || preg_match('/[\x00-\x1f]/', $root) === 1) {
            return null;
        }
        $root = rtrim(str_replace('\\', '/', $root), '/');
        if ($root === '' || preg_match('#^(/|[A-Za-z]:/)#', $root) !== 1 || preg_match('#(^|/)\.\.(/|$)#', $root) === 1) {
            return null;
        }

        return $root;
    }

    public static function uri(string $path, int $line, ?string $hostRoot = null): string
    {
        $path = self::mapPath($path, $hostRoot);
        $editor = (string) config('laraselector.editor', 'vscode');
        if (! in_array($editor, self::EDITORS, true)) {
            $editor = 'vscode';
        }
        $enc = self::encode($path);
        $abs = str_starts_with($path, '/') ? $path : '/'.$path;

        return match ($editor) {
            'phpstorm', 'idea', 'webstorm' => $editor.'://open?file='.rawurlencode($path).'&line='.$line,
            'zed' => 'zed://file'.self::encode($abs).':'.$line.':1',
            'sublime' => 'subl://open?url='.rawurlencode('file://'.$abs).'&line='.$line.'&column=1',
            'textmate' => 'txmt://open?url='.rawurlencode('file://'.$abs).'&line='.$line.'&column=1',
            'nova' => 'nova://open?path='.rawurlencode($path).'&line='.$line,
            default => $editor.'://file/'.$enc.':'.$line.':1',
        };
    }

    public static function mapPath(string $path, ?string $hostRoot = null): string
    {
        foreach ((array) config('laraselector.path_mapping', []) as $from => $to) {
            if (str_starts_with($path, $from)) {
                return $to.substr($path, strlen($from));
            }
        }

        $root = rtrim((string) (realpath((string) config('laraselector.application_root', base_path())) ?: ''), '/');
        if ($hostRoot !== null && $root !== '' && str_starts_with($path, $root.'/')) {
            return $hostRoot.substr($path, strlen($root));
        }

        return $path;
    }

    private static function encode(string $path): string
    {
        $path = str_replace('%2F', '/', rawurlencode($path));

        return (string) preg_replace('/^([A-Za-z])%3A/', '$1:', $path);
    }
}
