<?php

namespace LaraSelector\Http;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use LaraSelector\Activation;
use LaraSelector\RenderRecorder;
use LaraSelector\RequestStore;

/** Tags HTML responses with a request id and stores what was rendered, for the inspector. */
final class InspectRequest
{
    public function __construct(private Activation $activation, private RenderRecorder $recorder, private RequestStore $store) {}

    public function handle(Request $request, Closure $next)
    {
        if (! $this->activation->active() || str_starts_with($request->path(), '__laraselector')) {
            return $next($request);
        }

        $this->recorder->reset();
        $this->recorder->requestId = bin2hex(random_bytes(8));

        $response = $next($request);

        if (! $response instanceof Response || $request->ajax() || ! str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
            return $response;
        }

        $content = (string) $response->getContent();
        $at = stripos($content, '</head>');
        if ($at === false || ! $this->recorder->hasData()) {
            return $response;
        }

        $meta = '<meta name="laraselector-request" content="'.$this->recorder->requestId.'">';
        $response->setContent(substr_replace($content, $meta, $at, 0));
        $response->headers->set('X-LaraSelector-Request', $this->recorder->requestId);
        $this->store->save($this->recorder->requestId, $this->recorder->export() + ['url' => $request->fullUrl(), 'method' => $request->method()]);

        return $response;
    }
}
