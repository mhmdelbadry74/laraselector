<?php

namespace LaraSelector;

/** Quote-aware HTML opening-tag scanner; it deliberately leaves Blade/directives untouched. */
final class LaraSelectorMarkupTokenizer
{
    public static function instrument(string $html, string $path, LaraSelectorToken $tokens): string
    {
        $out = ''; $i = 0; $line = 1; $n = strlen($html); $raw = null;
        while ($i < $n) {
            if ($html[$i] === "\n") $line++;
            if ($html[$i] !== '<' || substr($html, $i, 4) === '<!--') { $out .= $html[$i++]; continue; }
            if (preg_match('/^<\/?\s*([A-Za-z][\w:-]*)/', substr($html, $i), $m) !== 1) { $out .= $html[$i++]; continue; }
            $tag = strtolower($m[1]); $closing = isset($html[$i + 1]) && $html[$i + 1] === '/';
            if ($closing) { $raw = $raw === $tag ? null : $raw; }
            $start = $i; $quote = null;
            while ($i < $n) { $c = $html[$i++]; if ($c === "\n") $line++; if ($quote) { if ($c === $quote) $quote = null; } elseif ($c === '"' || $c === "'") $quote = $c; elseif ($c === '>') break; }
            $chunk = substr($html, $start, $i - $start);
            // An opening tag containing a Blade expression is intentionally left alone: its
            // closing `>` can belong to PHP syntax (for example `$attributes->merge()`).
            if (! $closing && ! $raw && ! str_contains($chunk, '{{') && ! str_contains($chunk, '@') && ! str_starts_with($tag, 'x-') && ! str_starts_with($tag, 'livewire:') && ! in_array($tag, ['script','style','textarea'], true) && ! str_contains($chunk, 'data-laraselector=')) {
                $chunk = substr($chunk, 0, -1).' data-laraselector="'.$tokens->make($path, $line - substr_count($chunk, "\n")).'">';
            }
            if (! $closing && in_array($tag, ['script','style','textarea'], true)) $raw = $tag;
            $out .= $chunk;
        }
        return $out;
    }
}
