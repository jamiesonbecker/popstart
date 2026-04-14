# Popstart Field Notes

This file is the durable handoff note for the refactor that follows. It captures the architectural direction, recent decisions, live-environment facts, and concrete pitfalls already discovered in this directory so future work can resume from another cwd without relying on conversation memory.

## Current Position

The project is moving away from a single large-file demo/catalog shape toward a modular structure. The intended direction is not "more demos" or "yet another SPA framework." The intended direction is:

- `Popstart Core`: the small DOM/event/runtime layer
- `Popstart UI`: first-class HTML/CSS/behavior components
- `Popstart Wire` or `Popstart Live`: optional backend sync protocol with a very small surface area
- possible later `Popstart Mobile`: mobile-adaptive layer, only after the web-side component model is stable

The key product idea is an HTML-first active component system:

- more opinionated than raw utility CSS
- more interactive than static component galleries
- less framework-heavy than React/Vue-first component kits
- more declarative than imperative widget bootstrapping
- usable from plain script tags without a build step

Internal shorthand used in discussion:

- "inverted Bootstrap"
- closer to "HTML + CSS components with some JavaScript"
- Tailwind UI quality level, but with active behavior already working

Important caveat:

- do not promote every demo to a supported component
- keep a strict separation between primitives, composites, and patterns/demos

## Strategic Direction

The recommended product shape is:

1. `Core`

- event binding
- chain execution
- DOM helpers
- shared data store
- small protocol helpers

2. `UI`

- supported primitives with documented HTML/CSS/behavior contracts
- strong default styling
- lightweight behavior hooks
- progressive enhancement where possible

3. `Wire` / `Live`

- optional server-owned state path
- tiny protocol
- no backend lock-in
- works over `fetch`, `SSE`, or `WebSocket`

4. `Mobile` later

- not immediate scope
- only after the HTML-first component model is stable
- aim for mobile-adaptive, standards-based components rather than trying to clone Ionic's full stack on day one

## Positioning Relative To The Ecosystem

The adjacent systems reviewed and their relevant lessons:

- `Bootstrap`
  - people still want batteries-included UI
  - CSS + data-attribute JS remains a viable model
  - risk: vague component contracts turn into messy style/behavior coupling

- `Tailwind Plus` / `Headless UI`
  - people value polished, copy-pasteable component markup
  - design quality matters
  - split between static markup and active behavior is useful

- `Alpine`
  - local HTML-centric interactivity is attractive
  - risk: too much stateful app logic hiding in attributes

- `Stimulus`, `Hotwire`, `htmx`, `Unpoly`
  - HTML-first and enhancement-first models are real architecture choices, not toys
  - this is philosophically close to Popstart

- `Phoenix LiveView`, `Laravel Livewire`
  - prove that a narrow server/client protocol can be compelling
  - server-owned state works if the protocol stays small and DOM-aware

- `Svelte`
  - developers still like coherent component authoring as HTML/CSS/JS together
  - useful inspiration even though the runtime model is different

- `AngularJS v1`
  - people still miss the expressiveness of HTML that "comes alive"
  - useful lessons: keep template ergonomics and form power
  - avoid watcher soup, hidden magic, and sprawling reactive complexity

- `Ionic`
  - modern Ionic is relevant because it treats components as standards-friendly UI primitives with framework adapters
  - if Popstart expands toward mobile, the better route is adaptive HTML-first components, not immediate platform replication

## What Should Become First-Class

### Primitive Components

These are the best candidates for promotion into a real supported `UI` layer:

- notifications / toasts
- dropdown / menu
- popover
- modal / dialog
- tabs
- accordion
- tooltip
- autocomplete / search
- select menu
- date picker
- command palette
- inline validation states

### Composite Components

Supported, but composed from primitives:

- login
- signup
- MFA
- settings panel
- search + results panel
- wizard / step flow
- dashboard cards
- empty states
- result states
- table/filter toolbar

### Patterns Or Demos

These should remain examples until they earn a support contract:

- novelty interactions
- highly branded marketing sections
- flashy promo widgets
- very app-specific flows

Rule:

- if a widget does not have a clear HTML contract, CSS contract, behavior contract, accessibility baseline, and override story, it should remain a demo

## First Promotion Set

The recommended first 10 components to promote:

1. notifications
2. dropdown
3. modal
4. popover
5. tabs
6. accordion
7. autocomplete
8. select menu
9. command palette
10. date picker

This set is large enough to prove the model and small enough to keep the API coherent.

## Backend / Live Protocol Direction

There was explicit discussion about enabling a clear server state model with a very limited backend protocol surface.

Recommended principle:

- keep the protocol brutally small
- do not invent a large RPC layer
- keep backend implementation easy in any language

Recommended event shape:

```json
{
	"type": "event",
	"component": "searchbox",
	"id": "global-search",
	"name": "query.changed",
	"payload": {
		"value": "phoenix"
	}
}
```

Recommended response shapes:

```json
{
	"type": "patch",
	"target": "#search-results",
	"html": "<div class=\"result\">Phoenix LiveView</div>"
}
```

```json
{
	"type": "replace",
	"target": "#profile-form",
	"html": "<form>...</form>"
}
```

```json
{
	"type": "append",
	"target": "#feed",
	"html": "<li>New item</li>"
}
```

```json
{
	"type": "notify",
	"level": "success",
	"message": "Saved"
}
```

Suggested supported operations:

- `patch`
- `replace`
- `append`
- `prepend`
- `remove`
- `set-props`
- `dispatch`
- `notify`

Suggested transports:

- `fetch`
- `SSE`
- `WebSocket`

Do not expand beyond that early unless there is a concrete use case.

## Module Split Recommendation

The likely refactor target should separate at least:

- `popstart-core`
  - runtime binding
  - event dispatch / chains
  - base DOM helpers
  - shared data handling

- `popstart-ui`
  - supported component CSS
  - supported component behaviors
  - component registration or conventions

- `popstart-wire`
  - fetch / SSE / WebSocket helpers
  - protocol message handling
  - server patch application helpers

- `popstart-plugins`
  - optional or higher-level feature extensions

- `catalog` / `gallery`
  - the demo site and widget browser
  - should stop being the same thing as the supported runtime

The big rule for the refactor:

- split "product runtime" from "catalog/demo implementation"

Right now they are too entangled.

## Important Recent Runtime Changes

These changes have already been made in this directory and should be preserved during refactor unless consciously redesigned.

### Notification / Toast System

The old top-of-window alert banner path has been replaced in source with a toast notification system in `popstart-extras.js`.

Current intent:

- `__.notify(...)` is the primary API
- `__.notifySilent(...)` stores/hooks a notification without rendering a visible toast
- `__.alert*` wrappers forward into the toast system
- notifications write to `__.data.notifications`
- notifications can include:
  - `title`
  - `message`
  - `detail`
  - `level`
  - `timeout`
  - `visible`
  - `meta`

Important modularity changes already made:

- `__.config.notificationHandler`
- `__.config.notificationRenderer`
- `__.notificationUse(fn)`
- `__.notificationUnuse(fn)`
- document event `popstart:notification`

The goal is for plugins and customer code to be able to use notifications directly, not just through `__.alertSuccess`.

Important bug already fixed:

- `__.alertSuccess/Error/Warning/Info` were briefly creating a toast and then also calling old global logging helpers, which caused the legacy green/red top bars to continue appearing in stale environments
- current source removes that side effect

Important environment lesson:

- one old demo host was serving a stale March version of `popstart-extras.js`
- when diagnosing alerts or toasts, verify the served file contents, not just the repo state

### Widget Bug Fixes Already Landed

These concrete regressions were fixed and should not be accidentally reintroduced:

- `scrollspy`
  - sidebar/nav background and border now fill full height
  - implementation made container-scoped and repeat-safe

- `sidebar`
  - collapsed state no longer clips icons on the right
  - width/padding/icon-centering adjusted

- `sharemenu`
  - now uses a dedicated scoped toggle instead of generic sibling toggling
  - closes sibling menus
  - closes on outside click
  - stronger dropdown styling for actual visibility

- other prior widget scoping cleanups included:
  - `pagination`
  - before/after slider
  - image zoom
  - credit-card preview
  - mention input
  - scroll progress
  - scroll reveal
  - `splitpane`

Treat these as known historical defects that are easy to regress during a module split.

## Demo Server Status

The Python demo server was retired in favor of `server.go`.

Facts:

- `server.py` was removed
- `server.go` is the supported local dev/demo server
- it binds to `127.0.0.1` only by design
- local-only restrictions are intentional

Current known live convenience setup:

- nginx vhost exists for `popstart.z`
- nginx proxies `http://popstart.z/` to `127.0.0.1:8000`
- `/ws` is proxied with upgrade handling

This is environment setup, not repo code, but it matters for reproducing behavior.

## Refactor Rules

When the large refactor begins, keep these rules in mind:

1. separate runtime from catalog
2. do not let demos define accidental public APIs
3. preserve the HTML-first authoring model
4. preserve script-tag usability
5. keep behavior contracts small and explicit
6. keep component names and semantics stable once promoted
7. do not couple supported components to the giant `index.html` gallery page
8. treat accessibility as part of the contract, not optional polish
9. prefer progressive enhancement over all-client-state complexity
10. keep the future live protocol narrow and backend-agnostic

## Near-Term Implementation Plan

Recommended order once refactoring starts:

1. carve out `core`
2. carve out `ui` primitives
3. carve out `wire` helpers
4. move the demo catalog onto those modules
5. promote the first 10 components formally
6. only then define the backend protocol in code

Avoid doing the live protocol first. The supported component layer should exist before server synchronization semantics are frozen.

## Files To Revisit During The Refactor

These are likely to be touched during module splitting:

- `popstart-core.js`
- `popstart-extras.js`
- `popstart-plugins.js`
- `index.html`
- `widget.html`
- `README.md`
- `PLUGINS.md`
- `widgets/`
- `plugins/`

## Notes On Naming

Suggested public naming direction:

- `Popstart` = runtime
- `Popstart UI` = supported component layer
- `Popstart Wire` or `Popstart Live` = backend sync layer

Suggested internal language:

- avoid promising that every gallery widget is supported
- use:
  - `primitive`
  - `composite`
  - `pattern`
  - `demo`

That terminology prevents accidental scope creep.

## Final Reminder

The important strategic decision is not "add more widgets."

It is:

- choose a small number of high-value primitives
- make them first-class
- define clean contracts
- keep HTML as the center of gravity
- keep JavaScript as enhancement
- add server-state support later through a minimal protocol rather than a full framework rewrite
