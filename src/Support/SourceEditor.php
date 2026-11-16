<?php

namespace LaraSelector\Support;

use LaraSelector\LaraSelectorToken;

/**
 * Writes small, reviewable edits (text, class list, translation value) back to source files.
 * Every edit keeps an undo snapshot and refuses anything it cannot place unambiguously.
 */
final class SourceEditor
{
    public function __construct(private LaraSelectorToken $tokens) {}

    /** Replace literal text inside the Blade element that starts at $blade['line']. */
    public function text(array $blade, string $old, string $new): array
    {
        $old = trim($old);
        $new = trim($new);
        if ($old === '' || $old === $new || strlen($new) > 2000) {
            throw new EditException('Nothing to change.');
        }
        $src = $this->read($blade['path']);
        $offset = $this->lineOffset($src, $blade['line']);
        $window = substr($src, $offset, 6000);

        $candidates = array_values(array_unique([$old, htmlspecialchars($old, ENT_NOQUOTES), htmlspecialchars($old, ENT_QUOTES), htmlentities($old, ENT_NOQUOTES)]));
        $hits = [];
        foreach ($candidates as $c) {
            for ($p = 0; ($p = strpos($window, $c, $p)) !== false; $p += strlen($c)) {
                $hits[$p] = $c;
            }
        }
        if (! $hits) {
            // Source may wrap or double up whitespace; match each form with flexible whitespace.
            foreach ($candidates as $c) {
                $re = '/'.implode('\\s+', array_map(fn ($part) => preg_quote($part, '/'), preg_split('/\s+/u', $c, -1, PREG_SPLIT_NO_EMPTY))).'/u';
                if (preg_match_all($re, $window, $m, PREG_OFFSET_CAPTURE) > 0) {
                    foreach ($m[0] as [$text, $p]) {
                        $hits[$p] = $text;
                    }
                }
            }
        }
        if (! $hits) {
            throw new EditException('That text is not written literally in this Blade file (it may come from a variable or a translation).');
        }
        if (count($hits) > 1) {
            throw new EditException('That text appears more than once near this element; edit it in your editor.');
        }
        $pos = array_key_first($hits);
        $replacement = $this->bladeSafe(htmlspecialchars($new, ENT_NOQUOTES));

        return $this->write($blade['path'], substr_replace($src, $replacement, $offset + $pos, strlen($hits[$pos])), 'blade', $blade['relative'], $blade['line']);
    }

    /** Replace the class="" list of the element that starts at $blade['line']. */
    public function classes(array $blade, string $tag, string $old, string $new): array
    {
        $tag = strtolower($tag);
        $new = trim((string) preg_replace('/\s+/', ' ', $new));
        if (preg_match('/^[a-z][a-z0-9-]*$/', $tag) !== 1) {
            throw new EditException('Invalid element.');
        }
        if (preg_match('/["\'<>{}@\\\\]/', $new) === 1 || strlen($new) > 1000) {
            throw new EditException('Class names may not contain quotes, braces, @ or angle brackets.');
        }
        $src = $this->read($blade['path']);
        $offset = $this->lineOffset($src, $blade['line']);
        if (preg_match('/<'.preg_quote($tag, '/').'(?=[\s>\/])/i', $src, $m, PREG_OFFSET_CAPTURE, $offset) !== 1) {
            throw new EditException('Could not find the opening <'.$tag.'> tag at this line.');
        }
        $start = $m[0][1];
        $end = $this->tagEnd($src, $start);
        $chunk = substr($src, $start, $end - $start);
        if (preg_match('/(\sclass\s*=\s*)(["\'])(.*?)\2/s', $chunk, $c, PREG_OFFSET_CAPTURE) !== 1) {
            if ($old !== '') {
                throw new EditException('This element has no static class attribute in the source.');
            }
            $chunk2 = preg_replace('/^(<'.preg_quote($tag, '/').')/i', '$1 class="'.$new.'"', $chunk, 1);
        } else {
            if (self::sameClasses($c[3][0], $old) === false) {
                throw new EditException('The class list in the source differs from the page. Reload and try again.');
            }
            $chunk2 = substr_replace($chunk, $new, $c[3][1], strlen($c[3][0]));
        }

        return $this->write($blade['path'], substr_replace($src, $chunk2, $start, strlen($chunk)), 'blade', $blade['relative'], $blade['line']);
    }

    /** Replace one translation value on a single line of a lang file. */
    public function translation(string $relative, int $line, string $old, string $new, string $root): array
    {
        $path = realpath(rtrim($root, '/').'/'.ltrim($relative, '/'));
        $allowed = false;
        foreach (TranslationFinder::paths() as $dir) {
            $allowed = $allowed || ($path && str_starts_with($path, $dir.DIRECTORY_SEPARATOR));
        }
        if (! $path || ! $allowed || ! in_array(pathinfo($path, PATHINFO_EXTENSION), ['php', 'json'], true)) {
            throw new EditException('Translation file is not allowed.');
        }
        if ($new === '' || preg_match('/[\r\n]/', $new) === 1 || strlen($new) > 1000) {
            throw new EditException('Translation must be a single non-empty line.');
        }
        $src = $this->read($path);
        $lines = preg_split('/(?<=\n)/', $src) ?: [];
        if (! isset($lines[$line - 1])) {
            throw new EditException('Line not found.');
        }
        $json = str_ends_with($path, '.json');
        $target = $lines[$line - 1];
        $re = $json ? '/"(?:[^"\\\\]|\\\\.)*"/' : '/\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\$]|\\\\.)*"/';
        preg_match_all($re, $target, $m, PREG_OFFSET_CAPTURE);
        $hit = null;
        // The value is the last literal on a "key => value" line, so prefer the last match (a key may equal its value).
        foreach (array_reverse($m[0]) as [$lit, $at]) {
            if (($json ? json_decode($lit, true) : $this->unquotePhp($lit)) === $old) {
                $hit = [$lit, $at];
                break;
            }
        }
        if ($hit === null) {
            throw new EditException('The translation value was not found on that line.');
        }
        $replacement = $json ? json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : "'".str_replace(['\\', "'"], ['\\\\', "\\'"], $new)."'";
        $target = substr_replace($target, $replacement, $hit[1], strlen($hit[0]));
        $lines[$line - 1] = $target;

        return $this->write($path, implode('', $lines), 'lang', ltrim(substr($path, strlen((string) realpath($root))), DIRECTORY_SEPARATOR), $line);
    }

    public function undo(string $id): array
    {
        if (preg_match('/^[a-f0-9]{16}$/', $id) !== 1) {
            throw new EditException('Invalid undo id.');
        }
        $file = $this->undoDir().'/'.$id.'.json';
        $snap = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        if (! is_array($snap) || ! isset($snap['path'], $snap['before'], $snap['after'], $snap['kind'])) {
            throw new EditException('Nothing to undo.');
        }
        $path = realpath($snap['path']);
        if (! $path || ! $this->pathAllowed($path, $snap['kind'])) {
            throw new EditException('File is not allowed.');
        }
        if (sha1((string) file_get_contents($path)) !== $snap['after']) {
            throw new EditException('The file changed since the edit; refusing to overwrite it.');
        }
        file_put_contents($path, base64_decode($snap['before']), LOCK_EX);
        @unlink($file);

        return ['relative' => $snap['relative'], 'line' => $snap['line']];
    }

    public static function sameClasses(string $a, string $b): bool
    {
        $n = fn (string $s) => implode(' ', preg_split('/\s+/', trim($s), -1, PREG_SPLIT_NO_EMPTY) ?: []);

        return $n($a) === $n($b);
    }

    private function bladeSafe(string $s): string
    {
        return str_replace(['@', '{{', '{!!'], ['@@', '@{{', '@{!!'], $s);
    }

    private function pathAllowed(string $path, string $kind): bool
    {
        if ($kind === 'blade') {
            return $this->tokens->isInspectable($path) && str_ends_with($path, '.blade.php');
        }
        foreach (TranslationFinder::paths() as $dir) {
            if (str_starts_with($path, $dir.DIRECTORY_SEPARATOR)) {
                return true;
            }
        }

        return false;
    }

    private function read(string $path): string
    {
        $src = @file_get_contents($path);
        if ($src === false) {
            throw new EditException('Cannot read the source file.');
        }

        return $src;
    }

    private function lineOffset(string $src, int $line): int
    {
        $offset = 0;
        for ($i = 1; $i < $line; $i++) {
            $nl = strpos($src, "\n", $offset);
            if ($nl === false) {
                throw new EditException('Line not found.');
            }
            $offset = $nl + 1;
        }

        return $offset;
    }

    /** End offset (exclusive) of the opening tag starting at $start; quote-aware. */
    private function tagEnd(string $src, int $start): int
    {
        $quote = null;
        for ($i = $start, $n = strlen($src); $i < $n; $i++) {
            $c = $src[$i];
            if ($quote) {
                $quote = $c === $quote ? null : $quote;
            } elseif ($c === '"' || $c === "'") {
                $quote = $c;
            } elseif ($c === '>') {
                return $i + 1;
            }
        }
        throw new EditException('Unterminated tag.');
    }

    private function unquotePhp(string $lit): string
    {
        $inner = substr($lit, 1, -1);

        return $lit[0] === "'" ? str_replace(["\\'", '\\\\'], ["'", '\\'], $inner) : str_replace(['\\"', '\\\\'], ['"', '\\'], $inner);
    }

    private function write(string $path, string $after, string $kind, string $relative, int $line): array
    {
        $before = $this->read($path);
        if ($before === $after) {
            throw new EditException('Nothing changed.');
        }
        $dir = $this->undoDir();
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $id = bin2hex(random_bytes(8));
        file_put_contents($dir.'/'.$id.'.json', json_encode([
            'path' => $path, 'kind' => $kind, 'relative' => $relative, 'line' => $line,
            'before' => base64_encode($before), 'after' => sha1($after),
        ]));
        if (file_put_contents($path, $after, LOCK_EX) === false) {
            throw new EditException('Cannot write the source file.');
        }
        $all = glob($dir.'/*.json') ?: [];
        usort($all, fn ($a, $b) => filemtime($a) <=> filemtime($b));
        foreach (array_slice($all, 0, -20) as $old) {
            @unlink($old);
        }

        return ['undo' => $id, 'relative' => $relative, 'line' => $line];
    }

    private function undoDir(): string
    {
        return storage_path('framework/laraselector/undo');
    }
}
