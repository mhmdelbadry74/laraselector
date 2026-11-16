<?php

return [
    'enabled' => env('LARASELECTOR_ENABLED', false),
    'environments' => ['local', 'dev'],

    // vscode | vscode-insiders | vscodium | cursor | windsurf | zed | sublime | phpstorm | idea | webstorm | textmate | nova
    'editor' => env('LARASELECTOR_EDITOR', 'vscode'),

    'application_root' => base_path(),
    'path_mapping' => [],
    'inspect_paths' => [resource_path('views')],
    'php_inspect_paths' => [app_path(), base_path('routes')],
    'exclude_paths' => [resource_path('views/vendor')],
    'token_ttl_seconds' => 300,

    // Let the extension write text / class / translation edits back into your source files.
    'editing' => env('LARASELECTOR_EDITING', false),

    // Where to look for translations, stylesheets and Inertia pages.
    'lang_paths' => [lang_path(), resource_path('lang')],
    'css_paths' => [resource_path('css'), resource_path('sass'), resource_path('scss'), resource_path('less'), public_path('css')],
    'inertia_paths' => [resource_path('js/Pages'), resource_path('js/pages'), resource_path('ts/Pages'), resource_path('ts/pages')],

    // How many view renders / queries are kept per request for the inspector.
    'max_renders' => 400,
    'nplus1_threshold' => 3,
];
