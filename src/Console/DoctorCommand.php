<?php

namespace LaraSelector\Console;

use Illuminate\Console\Command;
use LaraSelector\Activation;

final class DoctorCommand extends Command
{
    protected $signature = 'laraselector:doctor';

    protected $description = 'Check that LaraSelector is configured correctly';

    public function handle(Activation $activation): int
    {
        $env = (string) app()->environment();
        $failed = false;

        $check = function (bool $ok, string $label, string $hint = '') use (&$failed) {
            $this->line(($ok ? '<info>✔</info> ' : '<error>✘</error> ').$label);
            if (! $ok) {
                $failed = true;
                if ($hint !== '') {
                    $this->line('    '.$hint);
                }
            }
        };

        $check((bool) config('laraselector.enabled'), 'LARASELECTOR_ENABLED is true', 'Set LARASELECTOR_ENABLED=true in .env');
        $check($env !== 'production', "Environment is not production ({$env})", 'LaraSelector is always denied in production.');
        $check(in_array($env, (array) config('laraselector.environments', []), true), "Environment '{$env}' is allowed", 'Add it to "environments" in config/laraselector.php');
        $check($activation->active(), 'LaraSelector is active');
        $check(in_array(config('laraselector.editor'), ['vscode', 'cursor', 'phpstorm'], true), 'Editor is supported ('.config('laraselector.editor').')', 'Use vscode, cursor or phpstorm.');
        $check((string) config('app.key') !== '', 'APP_KEY is set', 'Run php artisan key:generate');

        foreach ((array) config('laraselector.inspect_paths', []) as $path) {
            $check(is_dir($path), "Blade path exists: {$path}", 'Fix inspect_paths in config/laraselector.php');
        }
        foreach ((array) config('laraselector.php_inspect_paths', []) as $path) {
            $check(is_dir($path), "PHP path exists: {$path}", 'Fix php_inspect_paths in config/laraselector.php');
        }

        $compiled = (string) config('view.compiled');
        $stale = $compiled !== '' && is_dir($compiled) && count(glob($compiled.'/*.php') ?: []) > 0;
        $this->line($stale ? '<comment>!</comment> Compiled views exist. Run php artisan view:clear after changing the config.' : '<info>✔</info> No stale compiled views');

        $this->newLine();
        $this->line($failed ? '<error>Problems found.</error>' : '<info>All good. Load the Chrome extension and start selecting.</info>');

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
