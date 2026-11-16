<?php

namespace LaraSelector;

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

final class InstrumentingLaraSelectorCompiler extends BladeCompiler
{
    private ?string $sourcePath = null;
    public function __construct(Filesystem $files, string $cachePath, private LaraSelectorToken $tokens) { parent::__construct($files, $cachePath); }
    public function compile($path = null): void
    {
        $this->sourcePath = $path;
        parent::compile($path);
        $this->sourcePath = null;
    }
    public function compileString($value): string
    {
        if ($this->sourcePath && $this->tokens->isInspectable($this->sourcePath)) $value = LaraSelectorMarkupTokenizer::instrument($value, $this->sourcePath, $this->tokens);
        return parent::compileString($value);
    }
}
