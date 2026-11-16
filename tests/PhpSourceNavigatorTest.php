<?php

namespace LaraSelector\Tests;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use LaraSelector\PhpSourceNavigator;

final class PhpSourceNavigatorTest extends TestCase
{
    public function test_it_resolves_the_original_page_route_instead_of_the_resolve_endpoint(): void
    {
        config()->set('laraselector.php_inspect_paths', [__DIR__]);
        Route::get('/dashboard', [self::class, 'pageAction']);

        $result = app(PhpSourceNavigator::class)->page(
            Request::create('http://localhost/__laraselector/resolve', 'POST'),
            'http://localhost/dashboard'
        );

        $this->assertSame('tests/PhpSourceNavigatorTest.php', $result['relative']);
        $this->assertSame((new \ReflectionMethod(self::class, 'pageAction'))->getStartLine(), $result['line']);
    }

    public function pageAction(): void {}
}
