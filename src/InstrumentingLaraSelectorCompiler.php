<?php

namespace LaraSelector;

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

final class InstrumentingLaraSelectorCompiler extends BladeCompiler
{
    private ?string $sourcePath = null;

    public function __construct(Filesystem $files, string $cachePath, private LaraSelectorToken $tokens)
    {
        parent::__construct($files, $cachePath);
    }

    public function compile($path = null): void
    {
        $this->sourcePath = $path;
        parent::compile($path);
        $this->sourcePath = null;
    }

    public function compileString($value): string
    {
        $inspectable = $this->sourcePath && $this->tokens->isInspectable($this->sourcePath);

        if ($inspectable) {
            $value = LaraSelectorMarkupTokenizer::instrument($value, $this->sourcePath, $this->tokens);
        }

        $compiled = parent::compileString($value);

        if (! $inspectable) {
            return $compiled;
        }

        // Runtime no-ops unless LaraSelector is active; records nesting, timing and data for the inspector.
        $path = var_export($this->tokens->relative($this->sourcePath), true);

        return '<?php $__lsr = \\LaraSelector\\RenderRecorder::begin('.$path.', get_defined_vars()); ?>'.$compiled.'<?php \\LaraSelector\\RenderRecorder::end($__lsr); ?>';
    }
}
