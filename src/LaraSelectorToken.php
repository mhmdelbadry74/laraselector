<?php

namespace LaraSelector;

final class LaraSelectorToken
{
    public function __construct(private array $config, private string $key) {}

    public function isInspectable(string $path): bool
    {
        return $this->allowed(realpath($path) ?: '');
    }

    public function make(string $path, int $line): string
    {
        $real = realpath($path);
        $root = realpath($this->config['application_root']);

        $payload = rtrim(strtr(base64_encode(json_encode([
            'p' => ltrim(substr($real, strlen($root)), DIRECTORY_SEPARATOR),
            'l' => $line,
            'e' => time() + $this->config['token_ttl_seconds'],
        ])), '+/', '-_'), '=');

        return $payload.'.'.hash_hmac('sha256', $payload, $this->key);
    }

    public function relative(string $path): string
    {
        $real = realpath($path) ?: $path;
        $root = realpath($this->config['application_root']) ?: $this->config['application_root'];

        return ltrim(substr($real, strlen($root)), DIRECTORY_SEPARATOR);
    }

    /** @return array{path: string, relative: string, line: int} */
    public function resolve(string $token): array
    {
        [$payload, $signature] = array_pad(explode('.', $token, 2), 2, null);

        if (! $payload || ! $signature || ! hash_equals(hash_hmac('sha256', $payload, $this->key), $signature)) {
            throw new \InvalidArgumentException('Invalid source identifier.');
        }

        $data = json_decode(base64_decode(strtr($payload, '-_', '+/'), true), true);

        if (! is_array($data) || ! isset($data['p'], $data['l'], $data['e']) || $data['e'] < time() || ! is_int($data['l']) || $data['l'] < 1) {
            throw new \InvalidArgumentException('Invalid or expired source identifier.');
        }

        $path = realpath(rtrim($this->config['application_root'], '/').'/'.ltrim($data['p'], '/'));

        if (! $path || ! $this->allowed($path) || ! str_ends_with($path, '.blade.php')) {
            throw new \InvalidArgumentException('Source is not allowed.');
        }

        return [
            'path' => $path,
            'relative' => ltrim(substr($path, strlen(realpath($this->config['application_root']))), '/'),
            'line' => $data['l'],
        ];
    }

    private function allowed(string $path): bool
    {
        if (! $path) {
            return false;
        }

        foreach ($this->config['exclude_paths'] as $excluded) {
            if (($real = realpath($excluded)) && str_starts_with($path, $real.'/')) {
                return false;
            }
        }

        foreach ($this->config['inspect_paths'] as $included) {
            if (($real = realpath($included)) && str_starts_with($path, $real.'/')) {
                return true;
            }
        }

        return false;
    }
}
