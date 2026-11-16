<?php

namespace LaraSelector\Tests;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use LaraSelector\LaraSelectorToken;
use LaraSelector\RenderRecorder;
use LaraSelector\RequestStore;
use LaraSelector\Support\CssFinder;
use LaraSelector\Support\DataPreview;
use LaraSelector\Support\EditorLinks;
use LaraSelector\Support\TranslationFinder;

final class InspectorTest extends TestCase
{
    private function api(string $path, array $body)
    {
        return $this->withSession(['laraselector_token' => 'right'])->postJson('/__laraselector/'.$path, $body, ['X-LaraSelector-Token' => 'right']);
    }

    private function id(string $file, int $line = 2): string
    {
        return app(LaraSelectorToken::class)->make(__DIR__.'/fixtures/'.$file, $line);
    }

    public function test_data_preview_redacts_secrets_and_hides_internals(): void
    {
        $out = DataPreview::variables([
            '__env' => new \stdClass, 'app' => 1, 'password' => 'x', 'user' => ['name' => 'Ann', 'api_token' => 'abc'], 'n' => 3,
        ]);

        $this->assertSame(['password', 'user', 'n'], array_keys($out));
        $this->assertSame('••• redacted', $out['password']);
        $this->assertSame('••• redacted', $out['user']['api_token']);
        $this->assertSame('Ann', $out['user']['name']);
    }

    public function test_rendering_records_nesting_data_timing_and_queries(): void
    {
        view()->addNamespace('fx', __DIR__.'/fixtures/views');
        $recorder = app(RenderRecorder::class);
        $recorder->reset();

        // Blade is compiled lazily; render the page which includes the partial.
        view()->file(__DIR__.'/fixtures/views/page.blade.php', ['name' => 'Ann', 'secret' => 's'])->render();
        $export = $recorder->export();

        $paths = array_column($export['renders'], 'path');
        $this->assertSame(['tests/fixtures/views/page.blade.php', 'tests/fixtures/views/partial.blade.php'], $paths);
        $this->assertSame(0, $export['renders'][1]['parent']);
        $this->assertSame(['name' => 'Ann', 'secret' => '••• redacted'], $export['renders'][0]['data']);
        $this->assertGreaterThanOrEqual($export['renders'][1]['ms'], $export['renders'][0]['ms']);
    }

    public function test_queries_are_attributed_to_the_innermost_view_and_repeats_are_flagged(): void
    {
        $recorder = app(RenderRecorder::class);
        $recorder->reset();
        $i = $recorder->start('a.blade.php', []);
        foreach ([1, 2, 3, 4] as $n) {
            event(new QueryExecuted('select * from t where id = ?', [$n], 1.5, DB::connection('testing')));
        }
        $recorder->finish($i);
        $export = $recorder->export();

        $this->assertSame(4, $export['queryCount']);
        $this->assertSame(4, $export['renders'][0]['queries'][0]['count']);
        $this->assertSame(4, $export['nplus1'][0]['count']);
        $this->assertSame(['a.blade.php'], $export['nplus1'][0]['views']);
    }

    public function test_middleware_tags_html_and_inspect_returns_view_info(): void
    {
        view()->addNamespace('fx', __DIR__.'/fixtures/views');
        Route::middleware('web')->get('/p', fn () => view()->file(__DIR__.'/fixtures/views/page.blade.php', ['name' => 'Ann']));

        $res = $this->get('/p')->assertOk();
        preg_match('/laraselector-request" content="([a-f0-9]{16})"/', $res->getContent(), $m);
        $this->assertNotEmpty($m, 'meta tag injected');
        $this->assertSame($m[1], $res->headers->get('X-LaraSelector-Request'));
        $this->assertNotNull(app(RequestStore::class)->load($m[1]));

        $json = $this->api('inspect', ['id' => $this->id('views/partial.blade.php', 1), 'request' => $m[1], 'page' => 'http://localhost/p'])
            ->assertOk()->json();

        $this->assertSame('tests/fixtures/views/partial.blade.php', $json['view']['path']);
        $this->assertSame('Ann', $json['view']['renders'][0]['data']['name']);
        $this->assertSame(['tests/fixtures/views/page.blade.php', 'tests/fixtures/views/partial.blade.php'], array_column($json['view']['chain'], 'path'));
        $this->assertSame('/p', $json['route']['uri']);

        $page = $this->api('page', ['request' => $m[1], 'page' => 'http://localhost/p'])->assertOk()->json();
        $this->assertCount(2, $page['views']);
        $this->assertSame(2, $page['totals']['renders']);
    }

    public function test_json_responses_are_not_tagged(): void
    {
        Route::middleware('web')->get('/j', fn () => ['a' => 1]);
        $this->getJson('/j')->assertOk()->assertHeaderMissing('X-LaraSelector-Request');
    }

    public function test_invalid_request_ids_are_ignored(): void
    {
        $this->assertNull(app(RequestStore::class)->load('../../etc/passwd'));
        $this->api('page', ['request' => '../../x'])->assertOk()->assertJsonPath('views', []);
    }

    public function test_translation_finder_matches_php_and_json_values(): void
    {
        $f = new TranslationFinder;
        $php = $f->find('Welcome   back');
        $this->assertSame('messages.welcome', $php[0]['key']);
        $this->assertSame('en', $php[0]['locale']);
        $this->assertSame(4, $php[0]['line']);
        $this->assertSame('messages.nested.bye', $f->find('See you')[0]['key']);
        $this->assertSame('Hi', $f->find('Hello world')[0]['key']);
        $this->assertSame([], $f->find('Nope'));
    }

    public function test_css_finder_finds_classes_and_marks_utilities(): void
    {
        $r = (new CssFinder)->find(['title', 'box', 'p-4', 'md:flex']);

        $this->assertFalse($r[0]['utility']);
        $this->assertSame(1, $r[0]['matches'][0]['line']);
        $this->assertFalse($r[1]['utility']);
        $this->assertTrue($r[2]['utility']);
        $this->assertTrue($r[3]['utility']);
    }

    public function test_inspect_returns_translations_css_and_inertia(): void
    {
        $json = $this->api('inspect', ['id' => $this->id('sample.blade.php', 1), 'text' => 'Welcome back', 'classes' => ['title', 'p-4']])->assertOk()->json();

        $this->assertSame('messages.welcome', $json['translations'][0]['key']);
        $this->assertSame('tests/fixtures/lang/en/messages.php', $json['translations'][0]['source']['path']);
        $this->assertSame('tests/fixtures/css/app.css', $json['css']['classes'][0]['matches'][0]['source']['path']);
        $this->assertTrue($json['css']['classes'][1]['utility']);

        $page = $this->api('page', ['inertia' => ['component' => 'Dashboard']])->json();
        $this->assertSame('tests/fixtures/js/Pages/Dashboard.vue', $page['inertia']['source']['path']);
        $this->assertNull($this->api('page', ['inertia' => ['component' => '../../secret']])->json('inertia'));
    }

    public function test_inspect_requires_the_session_token(): void
    {
        $this->postJson('/__laraselector/inspect', ['id' => $this->id('sample.blade.php')])->assertForbidden();
    }

    public function test_editor_links_for_every_supported_editor(): void
    {
        $p = '/Users/me/my app/x.php';
        $cases = [
            'vscode' => 'vscode://file//Users/me/my%20app/x.php:7:1',
            'vscodium' => 'vscodium://file//Users/me/my%20app/x.php:7:1',
            'windsurf' => 'windsurf://file//Users/me/my%20app/x.php:7:1',
            'zed' => 'zed://file/Users/me/my%20app/x.php:7:1',
            'sublime' => 'subl://open?url=file%3A%2F%2F%2FUsers%2Fme%2Fmy%20app%2Fx.php&line=7&column=1',
            'idea' => 'idea://open?file=%2FUsers%2Fme%2Fmy%20app%2Fx.php&line=7',
            'textmate' => 'txmt://open?url=file%3A%2F%2F%2FUsers%2Fme%2Fmy%20app%2Fx.php&line=7&column=1',
        ];
        foreach ($cases as $editor => $expected) {
            config()->set('laraselector.editor', $editor);
            $this->assertSame($expected, EditorLinks::uri($p, 7), $editor);
        }
    }

    public function test_host_root_maps_container_paths_and_rejects_bad_values(): void
    {
        $root = rtrim((string) realpath(dirname(__DIR__)), '/');
        $this->assertSame('vscode://file//Users/me/proj/src/a.php:1:1', EditorLinks::uri($root.'/src/a.php', 1, '/Users/me/proj'));
        $this->assertSame('vscode://file/C:/code/proj/src/a.php:1:1', EditorLinks::uri($root.'/src/a.php', 1, EditorLinks::validHostRoot('C:\\code\\proj\\')));
        foreach (['relative/path', '/a/../b', "/a\0b", '', 5, str_repeat('/a', 400)] as $bad) {
            $this->assertNull(EditorLinks::validHostRoot($bad));
        }

        $json = $this->api('resolve', ['id' => $this->id('sample.blade.php', 1), 'host_root' => '/Users/me/proj'])->json();
        $this->assertSame('vscode://file//Users/me/proj/tests/fixtures/sample.blade.php:1:1', $json['editorUri']);
    }

    public function test_data_preview_survives_objects_that_throw_when_cast(): void
    {
        $bad = new class implements \Stringable
        {
            public function __toString(): string
            {
                throw new \RuntimeException('nope');
            }
        };
        $warn = new class implements \Stringable
        {
            public function __toString(): string
            {
                return (string) [];
            }
        };

        $out = DataPreview::variables(['a' => $bad, 'b' => $warn]);

        $this->assertIsString($out['a']);
        $this->assertIsString($out['b']);
    }
}
