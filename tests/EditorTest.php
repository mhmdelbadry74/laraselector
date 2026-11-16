<?php

namespace LaraSelector\Tests;

use LaraSelector\LaraSelectorToken;
use LaraSelector\Support\EditException;
use LaraSelector\Support\SourceEditor;

final class EditorTest extends TestCase
{
    protected function defineEnvironment($app)
    {
        parent::defineEnvironment($app);
        $dir = sys_get_temp_dir().'/ls-edit-'.bin2hex(random_bytes(4));
        @mkdir($dir.'/views', 0777, true);
        @mkdir($dir.'/lang/en', 0777, true);
        $dir = realpath($dir);
        $GLOBALS['ls_edit_dir'] = $dir;
        $app['config']->set('laraselector.application_root', $dir);
        $app['config']->set('laraselector.inspect_paths', [$dir.'/views']);
        $app['config']->set('laraselector.lang_paths', [$dir.'/lang']);
        $app['config']->set('laraselector.editing', true);
    }

    private function fx(string $src, int $line): array
    {
        $dir = $GLOBALS['ls_edit_dir'];
        file_put_contents($dir.'/views/a.blade.php', $src);

        return app(LaraSelectorToken::class)->resolve(app(LaraSelectorToken::class)->make($dir.'/views/a.blade.php', $line));
    }

    private function editor(): SourceEditor
    {
        return app(SourceEditor::class);
    }

    private function source(): string
    {
        return file_get_contents($GLOBALS['ls_edit_dir'].'/views/a.blade.php');
    }

    public function test_it_edits_literal_text_and_undoes_it(): void
    {
        $b = $this->fx("<div>\n  <h1 class=\"t\">Hello  &amp; world</h1>\n  <p>Other</p>\n</div>\n", 2);
        $r = $this->editor()->text($b, 'Hello & world', 'Hi @you {{ x }} <b>');

        $this->assertStringContainsString('<h1 class="t">Hi @@you @{{ x }} &lt;b&gt;</h1>', $this->source());
        $this->editor()->undo($r['undo']);
        $this->assertStringContainsString('Hello  &amp; world', $this->source());
    }

    public function test_it_refuses_ambiguous_or_non_literal_text(): void
    {
        $b = $this->fx("<p>Same</p>\n<p>Same</p>\n<p>{{ \$x }}</p>\n", 1);
        try {
            $this->editor()->text($b, 'Same', 'X');
            $this->fail('ambiguous edit should be refused');
        } catch (EditException $e) {
            $this->assertStringContainsString('more than once', $e->getMessage());
        }
        $this->expectException(EditException::class);
        $this->editor()->text($b, 'Missing', 'X');
    }

    public function test_it_edits_classes_on_the_right_tag(): void
    {
        $b = $this->fx("<div class=\"a\">\n<div\n   class='p-4   text-sm' id=\"x\">hi</div></div>\n", 2);
        $this->editor()->classes($b, 'div', 'p-4 text-sm', 'p-8 font-bold');

        $this->assertStringContainsString("class='p-8 font-bold' id=\"x\"", $this->source());
        $this->assertStringContainsString('<div class="a">', $this->source());
    }

    public function test_class_edit_checks_old_value_and_rejects_unsafe_values(): void
    {
        $b = $this->fx("<div class=\"a b\">x</div>\n", 1);
        foreach ([['a', 'c'], ['a b', 'x" onclick="y'], ['a b', '{{ $x }}'], ['a b', 'x@y']] as [$old, $new]) {
            try {
                $this->editor()->classes($b, 'div', $old, $new);
                $this->fail("should refuse $old -> $new");
            } catch (EditException) {
                $this->addToAssertionCount(1);
            }
        }
        $this->assertStringContainsString('class="a b"', $this->source());
    }

    public function test_it_edits_php_and_json_translations_and_only_inside_lang_paths(): void
    {
        $dir = $GLOBALS['ls_edit_dir'];
        file_put_contents($dir.'/lang/en/m.php', "<?php\nreturn [\n    'hi' => 'Hello',\n    'q' => 'It\\'s',\n];\n");
        file_put_contents($dir.'/lang/ar.json', "{\n    \"Save\": \"Save\"\n}\n");

        $this->editor()->translation('lang/en/m.php', 3, 'Hello', "Hey 'you'", $dir);
        $this->editor()->translation('lang/en/m.php', 4, "It's", 'Its', $dir);
        $this->editor()->translation('lang/ar.json', 2, 'Save', 'Store "it"', $dir);

        $this->assertSame("<?php\nreturn [\n    'hi' => 'Hey \\'you\\'',\n    'q' => 'Its',\n];\n", file_get_contents($dir.'/lang/en/m.php'));
        $this->assertSame('Store "it"', json_decode(file_get_contents($dir.'/lang/ar.json'), true)['Save']);

        $this->expectException(EditException::class);
        $this->editor()->translation('views/a.blade.php', 1, 'x', 'y', $dir);
    }

    public function test_undo_refuses_when_the_file_changed_since(): void
    {
        $b = $this->fx("<p>One</p>\n", 1);
        $r = $this->editor()->text($b, 'One', 'Two');
        file_put_contents($GLOBALS['ls_edit_dir'].'/views/a.blade.php', "<p>Changed</p>\n");

        $this->expectException(EditException::class);
        $this->editor()->undo($r['undo']);
    }

    public function test_edit_endpoint_requires_the_editing_flag(): void
    {
        $b = $this->fx("<p>One</p>\n", 1);
        $id = app(LaraSelectorToken::class)->make($GLOBALS['ls_edit_dir'].'/views/a.blade.php', 1);
        $call = fn (array $body) => $this->withSession(['laraselector_token' => 'k'])->postJson('/__laraselector/edit', $body, ['X-LaraSelector-Token' => 'k']);

        config()->set('laraselector.editing', false);
        $call(['kind' => 'text', 'id' => $id, 'old' => 'One', 'new' => 'Two'])->assertForbidden()->assertJsonPath('error.code', 'editing_disabled');
        $this->assertStringContainsString('One', $this->source());

        config()->set('laraselector.editing', true);
        $res = $call(['kind' => 'text', 'id' => $id, 'old' => 'One', 'new' => 'Two'])->assertOk();
        $this->assertStringContainsString('Two', $this->source());

        $this->withSession(['laraselector_token' => 'k'])->postJson('/__laraselector/undo', ['undo' => $res->json('undo')], ['X-LaraSelector-Token' => 'k'])->assertOk();
        $this->assertStringContainsString('One', $this->source());
        $call(['kind' => 'nope', 'id' => $id])->assertStatus(422);
        $this->postJson('/__laraselector/edit', ['kind' => 'text'])->assertForbidden();
    }
}
