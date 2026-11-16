<?php
namespace LaraSelector;

final class Activation
{
    public function __construct(private $app) {}
    /** This is intentionally evaluated at render/request time: compiled Blade may outlive .env changes. */
    public function active(): bool
    {
        $env = (string) $this->app->environment();
        return $env !== 'production' && (bool) config('laraselector.enabled')
            && in_array($env, (array) config('laraselector.environments', ['local', 'dev']), true);
    }
}
