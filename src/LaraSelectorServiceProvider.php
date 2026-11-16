<?php

namespace LaraSelector;

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\ServiceProvider;
use Illuminate\View\Compilers\BladeCompiler;
use LaraSelector\Console\DoctorCommand;
use LaraSelector\Http\LaraSelectorController;

final class LaraSelectorServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/laraselector.php', 'laraselector');

        $this->app->singleton(Activation::class, fn ($app) => new Activation($app));
        $this->app->singleton(LaraSelectorToken::class, fn ($app) => new LaraSelectorToken(
            $app['config']->get('laraselector'),
            (string) $app['config']->get('app.key'),
        ));
        $this->app->singleton(PhpSourceNavigator::class);

        $this->app->extend('blade.compiler', fn (BladeCompiler $compiler, $app) => new InstrumentingLaraSelectorCompiler(
            $app['files'],
            (string) config('view.compiled'),
            $app[LaraSelectorToken::class],
        ));
    }

    public function boot(): void
    {
        $this->publishes([__DIR__.'/../config/laraselector.php' => config_path('laraselector.php')], 'laraselector-config');

        if ($this->app->runningInConsole()) {
            $this->commands([DoctorCommand::class]);
        }

        $router = $this->app['router'];

        $router->middleware('web')
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->prefix('__laraselector')
            ->group(function () use ($router) {
                $router->get('capabilities', [LaraSelectorController::class, 'capabilities']);
                $router->post('handshake', [LaraSelectorController::class, 'handshake']);
                $router->post('resolve', [LaraSelectorController::class, 'resolve']);
            });
    }
}
