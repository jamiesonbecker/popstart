# Popstart Skill Document

You are generating HTML+JS for Popstart, a library that maps DOM events to functions via HTML attributes. There is no build step. Include `<script src="popstart-core.js"></script>` and optionally `<script src="popstart-extras.js"></script>` for HTTP, forms, alerts, cookies. Write plain `<script>` tags (NOT `type="module"` — functions must be on `window` or `__`).

## Rule 1: Event Attributes Call Functions

HTML attribute name = `ps-` + event name. Attribute value = function name(s). Use `ps-` prefix (recommended) or bare attributes (`click`), `data-` (`data-click`), `x-` (`x-click`).

```html
<button ps-click="save">Save</button>
<input ps-change="validate">
<form ps-submit="handleSubmit">
```

Default bound events: `mouseup`, `change`, `input`, `keyup`, `submit`, `click`.

## Rule 2: Function Chaining

Comma-separated functions execute as a sequential promise chain. If any rejects, the chain stops. Commas are required — spaces alone don't separate functions.

```html
<button ps-click="validate, save, __.redirect" redirect-url="/done">Submit</button>
```

## Rule 3: Arguments Come From Attributes

Function parameter NAMES determine which attributes to read. Given `function fetchData(url, method)`, Popstart reads `fetchData-url` and `fetchData-method` from the element:

```html
<button ps-click="fetchData"
  fetchData-url="/api/items"
  fetchData-method="POST">
  Fetch
</button>
```

**Pattern**: `{functionName}-{paramName}="value"`. All values are strings.

## Rule 4: Special Parameter Names

These parameter names are auto-injected (no attributes needed):
- `event` / `ev` / `evt` — the DOM Event object
- `element` / `el` / `ele` — the DOM Element

```html
<div ps-click="highlight">Click to highlight</div>
<script>function highlight(el) { el.style.background = 'yellow' }</script>
```

## Rule 5: Suffix Pattern for Repeated Calls

Append `-N` (dash required) to call the same function multiple times with different args:

```html
<button ps-click="fetchData-1, fetchData-2"
  fetchData-url-1="/api/users"
  fetchData-url-2="/api/posts">
  Load Both
</button>
```

Function names that naturally end in digits (e.g., `handler2`) are NOT treated as suffixed.

## Rule 6: Error Handling

Set `{functionName}-error` to name a custom error handler:

```html
<button ps-click="save" save-error="showSaveError">Save</button>
```

Error handler params named `e`, `msg`, `message`, `error`, `err`, `errorResponse`, `errorResponseText` receive the parsed error message. Fallback chain: per-function `fn-error`, then element-level `error` attribute, then `__.error()`.

**On error, the chain stops** — remaining functions never run. The error handler is an exit ramp: handle the failure, then optionally branch by calling `__.trigger()` on another element to fire a new chain. Each chain is self-contained with predictable data flow.

```html
<!-- error handler branches to a different element's chain -->
<div ps-startup="loadPrimary" loadPrimary-error="triggerFallback"></div>
<div id="fallback" startup="loadBackup, render"></div>
<script>function triggerFallback() { __.trigger('#fallback', 'startup') }</script>
```

## Rule 7: Data Persistence

Return values are stored in `__.data["functionPath"]`. Use `writedatapath` for a custom key:

```html
<div startup="loadUser" loadUser-url="/api/me" loadUser-writedatapath="user"></div>
<script>function loadUser(url) { return fetch(url).then(r => r.json()) }</script>
<!-- __.data["loadUser"] or __.data.user holds the result -->
```

Note: `undefined` returns are not stored. `0`, `false`, `null`, `""` are stored.

## Rule 8: Event Control

`click`, `submit`, `change`, `mouseup` get `preventDefault()` + `stopPropagation()` by default. Override with `{event}-prevent-default="false"`:

```html
<a ps-click="trackClick" ps-click-prevent-default="false">Normal Link</a>
```

## Rule 9: Startup Functions

`startup`, `startup1`, `startup2` attributes run on `DOMContentLoaded`:

```html
<div startup="loadConfig" loadConfig-url="/api/config"></div>
<script>function loadConfig(url) { return fetch(url).then(r => r.json()) }</script>
```

Note: startup events receive `{type:"startup"}`, not a real DOM Event.

## Rule 10: Function Lookup

Checks `__` namespace first, then `window`. Dot notation works: `click="app.save"` finds `window.app.save`.

## Rule 11: Built-in Utilities

Core includes: `__.show`, `__.hide`, `__.toggle`, `__.text`, `__.html`, `__.val`, `__.del`, `__.addClass`, `__.removeClass`, `__.toggleClass`, `__.hasClass`, `__.attr`, `__.trigger`, `__.delay`, `__.redirect`, `__.noop`.

Extras adds: `__.empty`, `__.append`, `__.focus`, `__.scrollTo`, `__.resetForm`, `__.switchTo`, `__.togglePanel`.

**One-line helpers** (extras):

`__.switchTo(show, hide, siblings, cls)` — tab/radio/nav switching. Hides `hide`, shows `show`, removes `cls` (default "active") from `siblings`, adds `cls` to clicked element.
```html
<button ps-click="__.switchTo" switchTo-show="#tab-1" switchTo-hide=".panels"
  switchTo-siblings=".tab-bar .btn">Tab 1</button>
```

`__.togglePanel(selector, cls)` — accordion/tree toggle. Toggles `selector` visibility, toggles `cls` (default "open") on clicked element.
```html
<button ps-click="__.togglePanel" togglePanel-selector="#faq1">Question?</button>
<div class="hidden" id="faq1">Answer</div>
```

`this`-binding (triggering element becomes `this` when called without a selector from an attribute chain) applies to `function`-keyword utilities: `__.text`, `__.html`, `__.val`, `__.show`, `__.hide`, `__.toggle`, `__.addClass`, `__.removeClass`, `__.toggleClass`, `__.empty`, `__.append`, `__.scrape`, `__.populate`, `__.populateEach`, `__.resetForm`, `__.getHTML`, `__.timedclass`, `__.switchTo`, `__.togglePanel`.

## Rule 12: Debounce

Default: click/mouseup 50ms, input/change/keyup 300ms. Override per-element: `debounce="500"` or `debounce="0"` to disable.

## Rule 13: Extras — HTTP, Forms, Lists, Streaming, Alerts, Cookies

When `popstart-extras.js` is loaded, these are available:

**HTTP** (fetch wrappers, auto-JSON, auto-error): `__.get(url, data, readdatapath, headers)`, `__.post(url, data, readdatapath, headers)`, `__.put`, `__.delete`, `__.patch`, `__.head`, `__.options`, `__.http(url, method, data, readdatapath, headers)`, `__.getHTML(url, selector)`. All default to reading `__.data.form` if no data attribute is set — GET appends as query params, POST/PUT/PATCH sends as JSON body. Set `__.config.httpHeaders` for default auth headers.

**Forms**: `__.validate([selector])` — HTML5 validation, rejects if invalid (stops chain). `__.scrape([selector, writeDataPath])` extracts all input values → `__.data.form`. `__.populate([selector, readdatapath])` fills inputs from `__.data`. Chain: `submit="__.validate, __.scrape, __.post"`.

**List Rendering**: `__.populateEach(selector, readdatapath, valuefield, labelfield, append)` renders arrays as repeated HTML. Use a `<template>` inside the target with `{key}` placeholders. For `<select>` elements, builds `<option>`s automatically (use `valuefield`/`labelfield` for object arrays). Fires `populated` event after rendering.

```html
<ul id="users"><template><li>{name} — {email}</li></template></ul>
<div startup="__.get, __.populateEach" get-url="/api/users"
  get-writedatapath="users" populateEach-selector="#users"
  populateEach-readdatapath="users"></div>

<select id="roles"><option value="">Pick…</option></select>
<div startup="__.get, __.populateEach" get-url="/api/roles"
  get-writedatapath="roles" populateEach-selector="#roles"
  populateEach-readdatapath="roles"
  populateEach-valuefield="id" populateEach-labelfield="name"></div>
```

**File Upload**: `__.upload(url, selector, name)` — POST file(s) via FormData. Auto-finds `input[type=file]`.

**Streaming**: `__.sseOpen(url, writedatapath, selector)` opens an SSE stream; `__.wsOpen(url, writedatapath, selector)` opens a WebSocket. Both accumulate JSON messages into `__.data[writedatapath]` as an array and auto-render via `__.populateEach` if `selector` is set. `__.wsSend(url, data)` sends over WebSocket. `__.sseClose(url)`, `__.wsClose(url)` to disconnect.

**DOM Extras**: `__.empty(selector)`, `__.append(selector, html)`, `__.focus(selector)`, `__.scrollTo(selector)`, `__.resetForm(selector)`.

**Notifications**: `__.notify(message, level, timeout, title, detail, visible, meta)` writes to `__.data.notifications` and optionally shows a toast. `__.notifySilent(...)` skips the toast. `__.alert(msg)`, `__.alertError(msg)`, `__.alertSuccess(msg)`, `__.alertWarning(msg)`, `__.alertInfo(msg)` are compatibility wrappers over the notification system.

**Cookies**: `__.writeCookie(name, value, days)`, `__.getCookie(name)`, `__.removeCookie(name)`, `__.succeedIfCookie(name, value)`, `__.failIfCookie(name, value)`.

**Storage & Clipboard**: `__.store(key, value)` — get/set/remove localStorage with auto JSON (`null` to remove, omit value to get). `__.session(key, value)` — same for sessionStorage. `__.copy(text)` — copy to clipboard (returns Promise).

**Extras**: `__.timedclass(selector, removeclassname, addclassname, time)` — swap classes, revert after time ms (default 2000). Useful for shake/flash animations.

**URL**: `__.argsParse()` → `__.data.args`, `__.requireArg(name)` rejects if missing.

## Rule 14: Plugins

When `popstart-plugins.js` is loaded, add `use="pluginName"` to any element. Popstart lazy-loads JS, CSS, and HTML templates from `__.config.pluginRoot` (default `/popstart/plugins`). Plugins add functions to `__`. Available plugins:

**Router**: `use="router"`. Use `route="/path"` attributes on elements — they auto-hide/show based on URL. `:param` segments extracted to `__.data.route.params`. Use `__.navigate(url)` to navigate. `routed` event fires when a route matches. `*` is catch-all.

```html
<div use="router"></div>
<a click="__.navigate" navigate-url="/users">Users</a>
<div route="/users/:id" routed="loadUser"></div>
```

**Drag & Drop**: `use="dragdrop"`. `sortable` attribute makes children draggable. `dropzone="fnName"` for file drops. `drag-handle` restricts drag to handle element. `sorted`/`dropped` events fire for chaining.

## Complete Example (Core Only)

```html
<script src="popstart-core.js"></script>

<div startup="loadItems" loadItems-writedatapath="items">
  <input keyup="filterItems" placeholder="Search...">
  <button click="addItem, loadItems" loadItems-writedatapath="items"
    addItem-error="showError">Add Item</button>
  <ul id="item-list"></ul>
</div>

<script>
function loadItems() {
  return fetch('/api/items').then(r => r.json()).then(items => {
    document.getElementById('item-list').innerHTML =
      items.map(i => `<li>${i.name}</li>`).join('')
    return items
  })
}
function addItem() {
  return fetch('/api/items', {method:'POST'}).then(r => {
    if (!r.ok) throw new Error('Failed'); return r.json()
  })
}
function filterItems(el) {
  const q = el.value.toLowerCase()
  document.querySelectorAll('#item-list li').forEach(li =>
    li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none')
}
function showError(msg) { alert(msg) }
</script>
```

## Complete Example (With Extras)

Same app, almost zero JS — uses `__.populateEach` for rendering:

```html
<script src="popstart-core.js"></script>
<script src="popstart-extras.js"></script>

<div startup="__.get, __.populateEach"
  get-url="/api/items" get-writedatapath="items"
  populateEach-selector="#item-list" populateEach-readdatapath="items">
  <input keyup="filterItems" placeholder="Search...">
  <button click="__.post, __.get, __.populateEach"
    post-url="/api/items" post-data='{}'
    get-url="/api/items" get-writedatapath="items"
    populateEach-selector="#item-list" populateEach-readdatapath="items"
    post-error="__.alertError">Add Item</button>
  <ul id="item-list">
    <template><li>{name}</li></template>
  </ul>
</div>

<script>
function filterItems(el) {
  const q = el.value.toLowerCase()
  document.querySelectorAll('#item-list li').forEach(li =>
    li.style.display = li.textContent.toLowerCase().includes(q) ? '' : 'none')
}
</script>
```

## Security: Sanitization

`__.safify(str)` escapes HTML entities. Available in core. Upgrades to DOMPurify if loaded.

**Template functions auto-sanitize**: `__.populate()` and `__.populateEach()` run all data values through `__._s()` (which calls `__.safify()` when `__.config.sanitize` is `true`, the default).

**Raw HTML functions do NOT auto-sanitize**: `__.html()`, `__.append()`, `__.prepend()`, `__.before()`, `__.after()`, `__.replace()`, `__.create()` accept developer markup as-is. When interpolating user data into HTML strings, **always call `__.safify()` on the user data first**:

```javascript
// SAFE — user data escaped
__.append('#list', '<li>' + __.safify(userData.name) + '</li>')

// SAFE — populateEach auto-escapes {name}
__.populateEach('#list', 'users')

// UNSAFE — never do this with user data
__.html('#output', userInput)
```

**Opt-out**: Set `__.config.sanitize = false` if you sanitize server-side before storage. Template functions will pass data through without escaping.

## What NOT To Do

- `click="alert('hi')"` — NO. Values must be function names, not inline JS or eval.
- `<script type="module">` — NO. Module-scoped functions are invisible to Popstart.
- Functions must exist at event time. Missing function = chain rejection.
- Arguments are always strings from attributes, never computed expressions.
- Don't use `this` as a param name — use `el`/`ele`/`element`.
- Both sync and async/Promise functions work in chains.
