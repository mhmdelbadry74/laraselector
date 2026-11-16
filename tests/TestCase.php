<?php

namespace LaraSelector\Tests;

use LaraSelector\LaraSelectorServiceProvider;
use Orchestra\Testbench\TestCase as Base;

abstract class TestCase extends Base
{
    protected function getPackageProviders($app)
    {
        return [LaraSelectorServiceProvider::class];
    }

    protected function defineEnvironment($app)
    {
        $app['config']->set('laraselector.enabled', true);
        $app['config']->set('laraselector.environments', ['local', 'dev', 'testing']);
        $app['config']->set('laraselector.inspect_paths', [__DIR__.'/fixtures']);
        $app['config']->set('laraselector.exclude_paths', []);
        $app['config']->set('laraselector.application_root', dirname(__DIR__));
        $app['config']->set('laraselector.lang_paths', [__DIR__.'/fixtures/lang']);
        $app['config']->set('laraselector.css_paths', [__DIR__.'/fixtures/css']);
        $app['config']->set('laraselector.inertia_paths', [__DIR__.'/fixtures/js/Pages']);
        $app['config']->set('laraselector.php_inspect_paths', [__DIR__]);
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('a', 32)));
    }
}
