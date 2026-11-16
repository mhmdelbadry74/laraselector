<?php

namespace LaraSelector\Tests;

final class DoctorCommandTest extends TestCase
{
    public function test_doctor_passes_when_configured(): void
    {
        $this->app['env'] = 'local';
        config()->set('laraselector.php_inspect_paths', [__DIR__]);

        $this->artisan('laraselector:doctor')->assertSuccessful();
    }

    public function test_doctor_fails_when_disabled(): void
    {
        $this->app['env'] = 'local';
        config()->set('laraselector.enabled', false);

        $this->artisan('laraselector:doctor')->assertFailed();
    }

    public function test_doctor_fails_in_production(): void
    {
        $this->app['env'] = 'production';

        $this->artisan('laraselector:doctor')->assertFailed();
    }
}
