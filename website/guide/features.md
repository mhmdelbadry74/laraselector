# Features

Press **Select** in the side panel, then click an element: the side panel shows everything LaraSelector knows about it. Update the package and run `php artisan view:clear` once to enable the details.

## Inspect

- **Data**: the variables passed to the view that rendered the element. Keys such as `password`, `token`, `secret`, `api_key` are redacted.
- **Stack**: the render stack with total and self time (a layout renders inside the page that `@extends` it).
- **Queries**: queries run while that view rendered. Identical SQL repeated 3+ times (`nplus1_threshold`) is flagged as a possible N+1.
- **Route**: name, methods, middleware, controller action, route parameters, the `FormRequest` and its rules for forms.
- **Livewire / Alpine**: component class, `render()`, the action under the cursor, public properties (snapshot) and `x-data`.
- **Inertia**: page component and props from *Page info*; opens the Vue/React/Svelte file from `inertia_paths`.
- **Translations**: click text to find its key in `lang/*.php` and `lang/*.json`, in every locale.
- **CSS**: which project stylesheet defines each class; utility classes (Tailwind) are marked and `tailwind.config.*` is one click away.

## Page-level tools (side panel)

- **Page info**: route, number of renders and queries, N+1 warnings, Inertia page.
- **Heatmap**: outlines every Blade partial on the page, coloured from green to red by its own render time.

## Edit in place

Off by default. Set `LARASELECTOR_EDITING=true`, then in the **Text** or **CSS** tab edit the value, preview it on the page and press **Save to source**.

- Text: replaces the literal text inside the element's Blade tag. If the text appears more than once nearby, or comes from a variable, nothing is written.
- Classes: rewrites the static `class=""` of that tag. Quotes, braces and `@` are refused.
- Translations: changes the value on its line in the PHP or JSON lang file.
- Every save returns **Undo**, which only works while the file is unchanged since the save.

## Bug reports

**Report** tab: copy or download a screenshot of the element, and copy a Markdown (GitHub/GitLab) or Jira description containing the page, selector, Blade file and line, controller, route, render stack and view data.

## Selecting several elements

**Shift+click** adds elements to a numbered selection. **Open all** opens every file in your editor, **Compare 2** shows a side-by-side diff (source, classes, text, computed styles and view data). In the **Compare** tab you can also pin an element and compare it with one on another page.

## Docker, Sail, WSL

Editor links need your machine's path. Either set `path_mapping` in the config or type the project path into **Project path on this machine** in the side panel settings (gear icon).
