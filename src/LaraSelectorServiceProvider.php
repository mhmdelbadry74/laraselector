<?php

namespace LaraSelector;

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\View\Compilers\BladeCompiler;
use LaraSelector\Console\DoctorCommand;
use LaraSelector\Http\InspectRequest;
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
        $this->app->singleton(RenderRecorder::class);
        $this->app->singleton(RequestStore::class);

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

        Event::listen(QueryExecuted::class, function (QueryExecuted $query) {
            if ($this->app[Activation::class]->active()) {
                $this->app[RenderRecorder::class]->query($query);
            }
        });

        $router = $this->app['router'];

        // Global middleware (like Debugbar): it must see the final HTML regardless of how the app defines its groups.
        $kernel = $this->app->make(Kernel::class);
        if (method_exists($kernel, 'pushMiddleware')) {
            $kernel->pushMiddleware(InspectRequest::class);
        }

        $router->middleware('web')
            ->withoutMiddleware(VerifyCsrfToken::class)
            ->prefix('__laraselector')
            ->group(function () use ($router) {
                $router->get('capabilities', [LaraSelectorController::class, 'capabilities']);
                $router->post('handshake', [LaraSelectorController::class, 'handshake']);
                $router->post('resolve', [LaraSelectorController::class, 'resolve']);
                $router->post('inspect', [LaraSelectorController::class, 'inspect']);
                $router->post('page', [LaraSelectorController::class, 'page']);
                $router->post('edit', [LaraSelectorController::class, 'edit']);
                $router->post('undo', [LaraSelectorController::class, 'undo']);
            });
    }
}
