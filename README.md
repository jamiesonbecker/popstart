# Popstart Core

**Build interactive web apps with HTML attributes and plain functions. No build step, no framework, no bundler.**

```html
<script src="popstart-core.js"></script>

<button ps-click="save">Save</button>

<script>
function save() { return fetch('/api/save', {method:'POST'}) }
</script>
```

That's it. The `ps-click` attribute names the function. Popstart calls it.

All four attribute prefixes work: `ps-click` (recommended), `click` (bare), `data-click` (standards-compliant), `x-click` (Alpine-style). Popstart checks `ps-` first for speed and namespace safety.

## Why Popstart?

**For humans**: Write less JavaScript. Your HTML reads like a spec — `click="validate, save, __.redirect"` tells you exactly what happens, in order. No event listeners, no querySelector spaghetti, no framework ceremony.

**For AI agents**: Popstart is the ideal target for LLM-generated code. The entire API is a single pattern — `{event}="{function}"` with `{function}-{param}="value"` — that fits in a small context window and produces correct code on the first try. No imports to hallucinate, no component lifecycle to get wrong, no JSX transpilation to misconfigure. An LLM that knows HTML can generate working Popstart apps. See `popstart-skill.md` for the complete LLM prompt.

**For both**: One `<script>` tag. Functions on `window`. Works in any browser. Ship a single HTML file or a full SPA — same API either way.

## Three Layers

```html
<!-- core: event binding, function chaining, DOM utilities -->
<script src="popstart-core.js"></script>

<!-- extras (optional): HTTP, forms, lists, streaming, alerts, cookies, storage -->
<script src="popstart-extras.js"></script>

<!-- plugins (optional): lazy-loaded modules via HTML attributes -->
<script src="popstart-plugins.js"></script>
```

**Core** is all you need for event handling and DOM manipulation. **Extras** adds the things real apps need — API calls, form scraping, list rendering, streaming, visual alerts, cookies, storage — without writing any of that boilerplate yourself. **Plugins** is the distribution layer — drop `use="router"` on any element and Popstart lazy-loads the router module, its CSS, and its HTML templates automatically.

## Demo Server

The demo backend now has a compiled Go implementation in `server.go`. It serves static files plus the local-only JSON store, uploads, SSE, WebSocket, and broadcast endpoints used by the demos.

```bash
go run .
# or: go run . 8876
```

It binds to `127.0.0.1` only and rejects non-local `Host` / `Origin` combinations for `/api/*` and `/ws`.

## How It Works

```html
<!-- 1. Event attribute = function to call -->
<button ps-click="save">Save</button>

<!-- 2. Comma-separated = sequential promise chain (stops on reject) -->
<button ps-click="validate, save, __.redirect" redirect-url="/done">Submit</button>

<!-- 3. Parameter names map to attributes: {fn}-{param}="value" -->
<button ps-click="api.post"
  post-url="/users"
  post-data='{"name":"Jo"}'
  post-error="showError">
  Create User
</button>

<script>
var api = {
  post: function(url, data) {
    return fetch(url, {method:'POST', body:data, headers:{'Content-Type':'application/json'}})
      .then(r => { if(!r.ok) throw r.statusText; return r.json() })
  }
}
function validate(el) { if (!el.checkValidity()) throw 'Invalid form' }
function showError(msg) { __.text('.error', msg); __.show('.error') }
</script>
```

With **extras loaded**, the same thing becomes zero JS:

```html
<button click="__.post"
  post-url="/users"
  post-data='{"name":"Jo"}'
  post-error="__.alertError">
  Create User
</button>
```

**Special parameter names** (auto-injected, no attribute needed):
- `event`/`ev`/`evt` — the DOM Event
- `element`/`el`/`ele` — the DOM Element

Functions must be on `window` or `__` (not `<script type="module">`). Auto-initializes on `DOMContentLoaded`.

## Suffix Pattern

Call the same function multiple times with `-N` (dash required):

```html
<button click="__.get-1, __.get-2"
  get-url-1="/api/user"    get-writedatapath-1="user"
  get-url-2="/api/prefs"   get-writedatapath-2="prefs">
  Load Both
</button>
```

Names ending in digits naturally (e.g., `handler2`) are not treated as suffixed.

## Error Handling

```html
<!-- Per-function handler: fn-error="handlerName" -->
<button click="save" save-error="onSaveError">Save</button>

<!-- Error handler receives parsed message via params named: -->
<!-- e, msg, message, error, err, errorResponse, errorResponseText -->
<script>
function onSaveError(msg, el) { __.text(el, msg); __.addClass(el, 'shake') }
</script>
```

Fallback chain: per-function `fn-error`, then element-level `error` attribute, then `__.error()`. Error messages from JSON responses are automatically extracted.

**On error, the chain stops.** The remaining functions are never called. Each chain is self-contained — if `func2` fails in `click="func1, func2, func3"`, `func3` does not run regardless of what the error handler does.

The error handler is an **exit ramp**: handle the failure, then optionally branch by firing a new chain on another element with `__.trigger()`. This keeps each chain's data flow predictable — no function runs with missing data from a failed predecessor.

```html
<!-- Pattern 1: show error message, chain stops -->
<button click="validate, save, __.redirect" redirect-url="/done"
  save-error="showError">Submit</button>

<!-- Pattern 2: auth gate — success continues, failure branches elsewhere -->
<div startup="__.succeedIfCookie, showDashboard"
  succeedIfCookie-name="auth" succeedIfCookie-value="1"
  succeedIfCookie-error="__.redirect" redirect-url="/login"></div>

<!-- Pattern 3: error handler triggers a different element's chain -->
<div startup="loadPrimary" loadPrimary-url="/api/primary"
  loadPrimary-error="triggerFallback"></div>
<div id="fallback" startup="loadBackup, render"
  loadBackup-url="/api/backup"></div>

<script>
function triggerFallback() { __.trigger('#fallback', 'startup') }
</script>
```

## Data Persistence

Return values stored in `__.data["fnPath"]`. Use `writedatapath` for a custom key:

```html
<div startup="loadUser" loadUser-url="/api/me" loadUser-writedatapath="user"></div>

<script>
function loadUser(url) {
  return fetch(url).then(r => r.json())
}
// after startup: __.data.user and __.data["loadUser"] both hold the result
</script>
```

`undefined` returns are not stored. `0`, `false`, `null`, `""` are all stored.

## Startup & Event Control

```html
<!-- startup/startup1/startup2 run on DOMContentLoaded -->
<div startup="init" startup-failure="initFailed"
  init-url="/api/config" init-writedatapath="config">

  <!-- prevent-default="false" opts out of auto-preventDefault -->
  <a click="trackClick" click-prevent-default="false" trackClick-href="/about">About</a>

  <!-- debounce="0" disables, debounce="500" overrides default -->
  <input keyup="search" debounce="500" search-url="/api/search">
</div>

<script>
function init(url) { return fetch(url).then(r => r.json()) }
function initFailed(el) { __.text(el, 'Failed to start') }
function search(url, el) {
  return fetch(url + '?q=' + encodeURIComponent(el.value)).then(r => r.json())
}
function trackClick(href) { navigator.sendBeacon('/track', href) }
</script>
```

Default events: `mouseup`, `change`, `input`, `keyup`, `submit`, `click`. Auto-calls `preventDefault()` + `stopPropagation()` on: `submit`, `mouseup`, `change`, `click` (override with `{event}-prevent-default="false"`).

`startup-failure` handlers fire when **any** startup promise rejects, not only the one on the same element. Startup events are synthetic (`{type:"startup"}`), not real DOM Events.

## Built-in Utilities (Core)

Functions using `function` keyword (not arrow) support `this`-binding — when called from an attribute chain without a selector arg, `this` is the triggering element. This applies to: `__.text`, `__.html`, `__.val`, `__.show`, `__.hide`, `__.toggle`, `__.addClass`, `__.removeClass`, `__.toggleClass`.

```html
<!-- use built-ins directly in chains -->
<button click="save, __.delay, __.redirect"
  delay-time="2000" redirect-url="/done">Save & Go</button>

<div click="__.toggleClass" toggleClass-classes="active">Toggle Me</div>
<div click="__.hide" hide-selector=".modal">Close Modal</div>
```

| Function | Description |
|----------|-------------|
| `__.el(selector [,container])` | Query DOM, returns array of elements |
| `__.text(selector, content)` | Get/set textContent |
| `__.html(selector, content)` | Get/set innerHTML (sanitized on write by default) |
| `__.val(selector, value)` | Get/set input value |
| `__.attr(selector, name [,value])` | Get/set attributes (handles `style`) |
| `__.show(selector)` | Remove `.hidden` class + clear `display:none` |
| `__.hide(selector)` | Add `.hidden` class + set `display:none` |
| `__.toggle(selector)` | Toggle show/hide |
| `__.addClass(selector, classes)` | Add class(es), space/comma-separated |
| `__.removeClass(selector, classes)` | Remove class(es) |
| `__.toggleClass(selector, classes)` | Toggle class(es) |
| `__.hasClass(selector, cls)` | Returns boolean |
| `__.del(selector)` | Remove elements from DOM |
| `__.trigger(selector, type)` | Fire a Popstart event chain programmatically |
| `__.delay(time)` | Promise, resolves after time ms (default 1000) |
| `__.redirect(url)` | Navigate to url |
| `__.noop()` | Do nothing (useful to stop propagation) |
| `__.Popstart()` | Re-bind all event listeners |
| `__.DOMWatcher.start/stop()` | Control MutationObserver auto-rebinding |

## Extras

Include `popstart-extras.js` after core for HTTP, forms, alerts, cookies, and URL args.

### HTTP — Zero-JS API Calls

Built-in fetch wrappers. Auto-JSON, auto-error rejection, auto-content-type. Set `__.config.httpHeaders` for default auth headers.

```html
<!-- GET on startup, store result -->
<div startup="__.get" get-url="/api/items" get-writedatapath="items"></div>

<!-- POST with inline data -->
<button click="__.post" post-url="/api/users"
  post-data='{"name":"Jo"}' post-error="__.alertError">Create</button>

<!-- scrape form → POST (__.post defaults to __.data.form when no data attr) -->
<form submit="__.scrape, __.post" post-url="/api/save">
  <input name="email" type="email">
  <input name="name" type="text">
  <button type="submit">Save</button>
</form>

<!-- scrape search form → GET with query params (/api/search?q=...) -->
<form submit="__.scrape, __.get"
  get-url="/api/search" get-writedatapath="results">
  <input name="q" placeholder="Search...">
  <button type="submit">Search</button>
</form>

<!-- GET + render HTML into element (HTMX-style) -->
<div click="__.getHTML" getHTML-url="/partials/sidebar"></div>
```

| Function | Description |
|----------|-------------|
| `__.get(url [,data, readdatapath, headers])` | GET (defaults to `__.data.form` as query params) |
| `__.post(url [,data, readdatapath, headers])` | POST (defaults to `__.data.form` as body) |
| `__.put(url [,data, readdatapath, headers])` | PUT (same default) |
| `__.delete(url [,headers])` | DELETE |
| `__.patch(url [,data, readdatapath, headers])` | PATCH (same default) |
| `__.head(url [,headers])` | HEAD (check resource existence) |
| `__.options(url [,headers])` | OPTIONS (CORS preflight) |
| `__.http(url, method [,data, readdatapath, headers])` | Any HTTP method |
| `__.getHTML(url [,selector])` | GET + render response into element |

### Forms — Scrape, Validate & Populate

```html
<!-- validate → scrape → post (stops chain if validation fails) -->
<form submit="__.validate, __.scrape, __.post" post-url="/api/save">
  <input name="email" type="email" required>
  <input name="name" type="text" required>
  <button type="submit">Save</button>
</form>

<!-- populate: fill inputs from __.data -->
<div startup="__.get, __.populate" get-url="/api/user"
  get-writedatapath="user" populate-readdatapath="user">
  <input name="email"> <input name="name">
</div>
```

| Function | Description |
|----------|-------------|
| `__.validate([selector])` | HTML5 validation — resolves if valid, rejects if invalid (stops chain) |
| `__.scrape([selector, writeDataPath])` | Extract form data → `__.data[writeDataPath]` (default `"form"`) |
| `__.populate([selector, readdatapath])` | Fill inputs/elements from `__.data[readdatapath]` (default `"form"`) |
| `__.safify(str)` | HTML-escape string (uses DOMPurify if loaded) |

Populate also fills `[populate="key"]` elements via sanitized HTML and supports `{key}` template replacement in `[populate-html]` elements. Fires a `populated` event on each element after filling, so you can chain follow-up actions.

### List Rendering — `__.populateEach`

Render arrays as cards, lists, tables, or select options. Uses `<template>` for HTML content and `{key}` placeholders.

```html
<!-- render cards from API data -->
<div startup="__.get, __.populateEach"
  get-url="/api/users" get-writedatapath="users"
  populateEach-selector="#user-list" populateEach-readdatapath="users">
</div>
<ul id="user-list">
  <template><li><strong>{name}</strong> — {email}</li></template>
</ul>

<!-- auto-populate a <select> dropdown -->
<div startup="__.get, __.populateEach"
  get-url="/api/roles" get-writedatapath="roles"
  populateEach-selector="#role-select" populateEach-readdatapath="roles"
  populateEach-valuefield="id" populateEach-labelfield="name">
</div>
<select id="role-select"><option value="">Pick a role…</option></select>
```

For `<select>` elements, each array item becomes an `<option>`. Strings/numbers become both value and label. Objects use `valuefield`/`labelfield` (default `"value"`/`"label"`). The first placeholder `<option>` (empty value) is preserved.

For all other elements, a `<template>` child provides the repeating HTML. `{key}` placeholders are replaced with item values. `{.}` and `{value}` work for simple string/number arrays. Item values are HTML-escaped unless you explicitly disable sanitization. Fires a `populated` event after rendering.

| Function | Description |
|----------|-------------|
| `__.populateEach(selector, readdatapath [,valuefield, labelfield, append])` | Render array → repeated HTML or `<option>`s |

### File Upload

```html
<form submit="__.upload, __.alertSuccess"
  upload-url="/api/avatar" alertSuccess-msg="Uploaded!">
  <input type="file" name="avatar">
  <button type="submit">Upload</button>
</form>
```

| Function | Description |
|----------|-------------|
| `__.upload(url [,selector, name])` | POST file(s) via FormData, auto-finds `input[type=file]` |

### DOM Extras

| Function | Description |
|----------|-------------|
| `__.empty(selector)` | Clear element innerHTML |
| `__.append(selector, html)` | Append HTML to element (sanitized on write by default) |
| `__.toggleNext([selector])` | Toggle the next sibling element |
| `__.hideClosest(match)` | Hide the nearest ancestor matching selector |
| `__.showClosest(match)` | Show the nearest ancestor matching selector |
| `__.focus(selector)` | Focus first matching element |
| `__.scrollTo(selector)` | Smooth-scroll to element |
| `__.resetForm(selector)` | Reset form to defaults |

### Notifications — Visual Feedback

Toast notifications render in a bottom-right stack, write into `__.data.notifications`, support optional technical `detail`, and auto-dismiss with a close button. Existing `__.alert*` helpers now forward into the notification system.

```html
<button click="__.post, __.alertSuccess"
  post-url="/api/save" alertSuccess-msg="Saved!">Save</button>
```

| Function | Description |
|----------|-------------|
| `__.notify(message [,level, timeout, title, detail, visible, meta])` | Create a notification object + optional toast |
| `__.notifySilent(message [,level, timeout, title, detail, meta])` | Store + hook a notification without showing a toast |
| `__.notificationUse(fn)` | Subscribe plugin/app code to notification lifecycle payloads |
| `__.notificationUnuse(fn)` | Remove a notification lifecycle subscriber |
| `__.alert(msg [,classes, timeout])` | Compatibility wrapper for `__.notify()` |
| `__.alertError(msg [,timeout])` | Error toast wrapper |
| `__.alertSuccess(msg [,timeout])` | Success toast wrapper |
| `__.alertWarning(msg [,timeout])` | Warning toast wrapper |
| `__.alertInfo(msg [,timeout])` | Info toast wrapper |
| `__.alertClose([id])` | Dismiss one or all active notifications |
| `__.timedclass(selector, remove, add [,time])` | Swap classes, revert after time ms (default 2000) |

Each notification entry uses `{id, level, title, message, detail, visible, timeout, meta, createdAt}` and is pruned from `__.data.notifications` when dismissed or expired. Set `__.config.notificationHandler = function(note){ ... }` for optional side effects such as backend logging, or `__.config.notificationRenderer = function(note){ ... }` to supply a custom toast element (or `false` to suppress rendering). Plugins and app code can also subscribe via `__.notificationUse(fn)` or listen for `popstart:notification` on `document`.

Extras also upgrades `__.error()` — tries `.error-msg` element first (core behavior), then falls back to an error toast with optional technical detail.

### Streaming — SSE & WebSocket

Live data streams that auto-accumulate into `__.data` and optionally auto-render via `__.populateEach`.

```html
<!-- SSE: live feed renders into a list -->
<div startup="__.sseOpen" sseOpen-url="/api/feed"
  sseOpen-writedatapath="feed" sseOpen-selector="#feed"></div>
<ul id="feed">
  <template><li>{message} <small>{timestamp}</small></li></template>
</ul>

<!-- WebSocket: live chat -->
<div startup="__.wsOpen" wsOpen-url="wss://example.com/chat"
  wsOpen-writedatapath="messages" wsOpen-selector="#chat"></div>
<ul id="chat">
  <template><li><b>{user}</b>: {text}</li></template>
</ul>

<!-- send a message -->
<form submit="__.scrape, wsSendChat">
  <input name="text" placeholder="Type...">
  <button type="submit">Send</button>
</form>
<script>
function wsSendChat() { __.wsSend('wss://example.com/chat', __.data.form) }
</script>
```

Each incoming message is JSON-parsed (falls back to raw string), pushed to `__.data[writedatapath]` as an array, and if `selector` is set, `__.populateEach` re-renders the target automatically.

| Function | Description |
|----------|-------------|
| `__.sseOpen(url [,writedatapath, selector])` | Open SSE stream, accumulate messages, auto-render |
| `__.sseClose(url)` | Close SSE connection |
| `__.wsOpen(url [,writedatapath, selector])` | Open WebSocket, accumulate messages, auto-render |
| `__.wsClose(url)` | Close WebSocket |
| `__.wsSend(url, data)` | Send data over open WebSocket (auto JSON.stringify) |

### Cookies

```html
<div startup="__.succeedIfCookie, showDashboard"
  succeedIfCookie-name="auth" succeedIfCookie-value="1"
  succeedIfCookie-error="__.redirect" redirect-url="/login">
</div>
```

| Function | Description |
|----------|-------------|
| `__.writeCookie(name, value [,days])` | Set cookie |
| `__.getCookie(name)` | Read cookie value |
| `__.removeCookie(name)` | Delete cookie |
| `__.succeedIfCookie(name, value)` | Promise: resolves if cookie matches, rejects otherwise |
| `__.failIfCookie(name, value)` | Promise: rejects if cookie matches, resolves otherwise |

### Storage & Clipboard

```html
<!-- save to localStorage on click -->
<button click="__.scrape, savePrefs">Save Preferences</button>
<script>function savePrefs() { __.store('prefs', __.data.form) }</script>

<!-- copy to clipboard -->
<button click="__.copy, __.alertSuccess" copy-text="https://example.com"
  alertSuccess-msg="Link copied!">Copy Link</button>
```

| Function | Description |
|----------|-------------|
| `__.store(key [,value])` | Get/set/remove localStorage (auto JSON). `null` removes. |
| `__.session(key [,value])` | Same for sessionStorage |
| `__.copy(text)` | Copy text to clipboard (Promise) |

### URL Args

```html
<div startup="__.argsParse"></div>
<!-- __.data.args now contains all query params as key/value pairs -->

<div startup="__.requireArg" requireArg-name="token"
  requireArg-error="__.redirect" redirect-url="/login"></div>
<!-- rejects (stops chain) if ?token= is missing -->
```

| Function | Description |
|----------|-------------|
| `__.argsParse([writedatapath])` | Parse all query args → `__.data.args` |
| `__.requireArg(name [,writedatapath])` | Require a query arg, reject if missing |

## Plugins

Include `popstart-plugins.js` for lazy-loaded modules. Add `use="pluginName"` to any element — Popstart loads the plugin's JS, CSS, and HTML template from `__.config.pluginRoot`.

```html
<script src="popstart-core.js"></script>
<script src="popstart-extras.js"></script>
<script src="popstart-plugins.js"></script>

<!-- just add use="" — Popstart handles the rest -->
<div use="router"></div>
<ul use="dragdrop" sortable>
  <li>Drag me</li>
  <li>And me</li>
</ul>
```

### How Plugins Work

A plugin is a directory at `__.config.pluginRoot` (default `/popstart/plugins`):

```
/popstart/plugins/myplugin/
  myplugin.js    ← required: adds functions to __
  myplugin.css   ← optional: auto-injected into <head>
  myplugin.html  ← optional: sanitized + injected hidden into <body>
```

The loader fetches all three (CSS and HTML are optional — silent fail), injects them, calls `__.Popstart()` to rebind, then fires a `use-loaded` event on the requesting element. Plugin HTML templates are sanitized before insertion, then arrive hidden and ready for `__.show`, `__.populate`, `__.populateEach`.

Plugins can assume core + extras are loaded. A plugin is just a JS file that puts functions on `__` — no special API, no lifecycle hooks.

```js
// /popstart/plugins/myplugin/myplugin.js
__.myplugin = { doThing: function() { ... } }
```

### Plugin Configuration

```html
<!-- change plugin root path -->
<script>__.config.pluginRoot = '/static/ps-plugins'</script>

<!-- or load programmatically -->
<script>__.loadPlugin('router').then(() => console.log('ready'))</script>
```

| Function | Description |
|----------|-------------|
| `__.loadPlugin(name)` | Load a plugin by name (returns Promise) |
| `__.loadPlugins()` | Scan DOM for `use=""` attributes and load all |
| `__.config.pluginRoot` | Plugin directory root (default `/popstart/plugins`) |

### Router Plugin

SPA routing with hash or history API. Hides/shows `[route]` elements based on URL.

```html
<div use="router"></div>

<nav>
  <a click="__.navigate" navigate-url="/dashboard" nav="/dashboard">Dashboard</a>
  <a click="__.navigate" navigate-url="/users" nav="/users">Users</a>
</nav>

<div route="/" routed="loadHome">Home</div>
<div route="/dashboard" routed="loadDashboard"></div>
<div route="/users/:id" routed="loadUser"></div>
<div route="*" routed="load404">Page not found</div>

<script>
function loadUser() {
  // __.data.route.params.id has the :id value
  return __.get('/api/users/' + __.data.route.params.id)
}
</script>
```

Route params (`:id`, `:slug`) are extracted into `__.data.route.params`. `*` is the catch-all. `[nav]` elements auto-get an active class matching the current route. Set `__.config.routeMode = 'history'` for History API (default is `'hash'`).

| Function | Description |
|----------|-------------|
| `__.navigate(url)` | Navigate to route (pushState or hash) |
| `__.historyReplace(url)` | Replace current route (no back entry) |
| `__.back()` | Go back |
| `__.matchPath(pattern, path)` | Match route pattern, returns params or null |
| `__.routePath()` | Get current route path |
| `__.resolveRoute([path])` | Manually resolve a route |

### Drag & Drop Plugin

Sortable lists and file drop zones via HTML attributes.

```html
<div use="dragdrop"></div>

<!-- sortable list -->
<ul sortable>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

<!-- sortable with drag handle -->
<ul sortable sorted="onReorder">
  <li><span drag-handle>☰</span> First</li>
  <li><span drag-handle>☰</span> Second</li>
</ul>

<!-- file drop zone -->
<div dropzone="handleFiles" class="drop-area">
  Drop files here
</div>

<script>
function onReorder() {
  // __.data.sorted.items = [{index, text, el}, ...]
  console.log('New order:', __.data.sorted.items.map(i => i.text))
}
function handleFiles(files) {
  files.forEach(f => console.log(f.name, f.size))
}
</script>
```

`sortable` makes child elements draggable. `drag-handle` restricts drag start to a handle element. `dropzone="fnName"` creates a file/element drop target. Both fire Popstart events (`sorted`, `dropped`) for chaining.

## Configuration

Pre-define before loading, or modify after:

```html
<!-- before: pre-seed window.__ so the script merges with it -->
<script>window.__={config:{BoundEventNames:'mouseup change input keyup submit click mouseover focus'.split(' ')}}</script>
<script src="popstart-core.js"></script>

<!-- after: override individual keys -->
<script>__.config.DebounceTimes.click = 100</script>

<!-- extras: set default HTTP headers -->
<script>__.config.httpHeaders = {'Authorization': 'Bearer ' + token}</script>
```

| Key | Default | Description |
|-----|---------|-------------|
| `BoundEventNames` | `mouseup change input keyup submit click` | Events to bind |
| `DebounceTimes` | `{click:50, mouseup:50, input:300, change:300, keyup:300}` | Per-event debounce ms |
| `AttrPrefixes` | `['ps-','','data-','x-']` | Attribute prefixes, checked in order (first match wins) |
| `StopPropagationEventNames` | `submit mouseup change click` | Events that auto-stop |
| `AlwaysPreventDefault` | `false` | Prevent default on all events |
| `DontAutostart` | `false` | Skip auto-init on DOMContentLoaded |
| `sanitize` | `true` | HTML-escape data values in `__.populate()` / `__.populateEach()` |
| `sanitizeHTMLSinks` | `true` | Sanitize writes through raw HTML sink helpers like `__.html()` / `__.append()` |
| `httpHeaders` | `{}` | Default headers for `__.get`/`__.post`/etc (extras) |
| `pluginRoot` | `/popstart/plugins` | Plugin directory root (plugins) |
| `routeMode` | `hash` | `'hash'` or `'history'` (router plugin) |

## Function Lookup

1. `__` namespace first, then `window`. Dot notation works: `click="myApp.save"`.
2. Comments in attributes: `/* */`, `//`, and `#` styles supported.
3. DOM changes auto-rebind via MutationObserver — no manual `__.Popstart()` needed.
