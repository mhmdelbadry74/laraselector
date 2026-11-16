<?php

namespace LaraSelector\Tests;

use LaraSelector\LaraSelectorToken;

final class EndpointsTest extends TestCase
{
    private function validId(): string
    {
        return app(LaraSelectorToken::class)->make(__DIR__.'/fixtures/sample.blade.php', 3);
    }

    public function test_capabilities_are_available_when_active(): void
    {
        $this->getJson('/__laraselector/capabilities')->assertOk()->assertJsonPath('protocol', 2);
    }

    public function test_every_endpoint_is_404_when_disabled(): void
    {
        config()->set('laraselector.enabled', false);

        $this->getJson('/__laraselector/capabilities')->assertNotFound();
        $this->postJson('/__laraselector/handshake')->assertNotFound();
        $this->postJson('/__laraselector/resolve', ['id' => $this->validId()])->assertNotFound();
    }

    public function test_every_endpoint_is_404_in_production_even_if_allowlisted(): void
    {
        $this->app['env'] = 'production';
        config()->set('laraselector.environments', ['production']);

        $this->getJson('/__laraselector/capabilities')->assertNotFound();
        $this->postJson('/__laraselector/handshake')->assertNotFound();
    }

    public function test_handshake_returns_a_token(): void
    {
        $response = $this->postJson('/__laraselector/handshake')->assertOk();

        $this->assertNotEmpty($response->headers->get('X-LaraSelector-Token'));
    }

    public function test_handshake_rejects_a_foreign_origin(): void
    {
        $this->postJson('/__laraselector/handshake', [], ['Origin' => 'https://evil.example'])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'origin_denied');
    }

    public function test_resolve_requires_the_session_token(): void
    {
        $this->postJson('/__laraselector/resolve', ['id' => $this->validId()])->assertForbidden();

        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId()], ['X-LaraSelector-Token' => 'wrong'])
            ->assertForbidden();
    }

    public function test_resolve_rejects_a_foreign_origin(): void
    {
        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId()], [
                'X-LaraSelector-Token' => 'right',
                'Origin' => 'https://evil.example',
            ])->assertForbidden();
    }

    public function test_resolve_rejects_an_invalid_or_tampered_id(): void
    {
        $headers = ['X-LaraSelector-Token' => 'right'];

        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => 'nonsense'], $headers)
            ->assertStatus(422)->assertJsonPath('error.code', 'invalid_source');

        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId().'x'], $headers)
            ->assertStatus(422);
    }

    public function test_resolve_returns_a_vscode_uri_for_a_valid_id(): void
    {
        $response = $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId()], ['X-LaraSelector-Token' => 'right'])
            ->assertOk()
            ->assertJsonPath('source.path', 'tests/fixtures/sample.blade.php')
            ->assertJsonPath('source.line', 3);

        $this->assertStringStartsWith('vscode://file/', $response->json('editorUri'));
        $this->assertStringEndsWith('/tests/fixtures/sample.blade.php:3:1', $response->json('editorUri'));
    }

    public function test_resolve_supports_cursor_phpstorm_and_path_mapping(): void
    {
        $call = fn () => $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId()], ['X-LaraSelector-Token' => 'right']);

        config()->set('laraselector.editor', 'cursor');
        $this->assertStringStartsWith('cursor://file/', $call()->json('editorUri'));

        config()->set('laraselector.editor', 'phpstorm');
        $this->assertStringStartsWith('phpstorm://open?file=', $call()->json('editorUri'));
        $this->assertStringEndsWith('&line=3', $call()->json('editorUri'));

        config()->set('laraselector.editor', 'vscode');
        config()->set('laraselector.path_mapping', [dirname(__DIR__) => '/Users/me/project']);
        $this->assertStringStartsWith('vscode://file//Users/me/project/tests/fixtures/sample.blade.php', $call()->json('editorUri'));
    }

    public function test_an_unknown_editor_falls_back_to_vscode(): void
    {
        config()->set('laraselector.editor', 'notepad');

        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', ['id' => $this->validId()], ['X-LaraSelector-Token' => 'right'])
            ->assertOk();
    }

    public function test_resolve_ignores_invalid_livewire_info(): void
    {
        $this->withSession(['laraselector_token' => 'right'])
            ->postJson('/__laraselector/resolve', [
                'id' => $this->validId(),
                'livewire' => ['component' => '../../etc/passwd', 'action' => 'save'],
            ], ['X-LaraSelector-Token' => 'right'])
            ->assertOk()
            ->assertJsonMissingPath('targets.livewireAction')
            ->assertJsonMissingPath('targets.livewireComponent');
    }
}
