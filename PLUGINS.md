# Popstart Plugin Registry

Master list of plugins. Each is a directory under `pluginRoot` with `{name}.js` (required), `{name}.css` and `{name}.html` (optional). Load with `<div ps-use="name"></div>`.

All plugins assume core + extras. Plugin HTML templates use `ps-*` attributes. Plugin JS uses `__.*` functions — no raw DOM APIs unless necessary.

---

## Tier 1 — Ship With Core Distribution

These solve the most common app-building tasks. Each is <200 lines.

### router
SPA routing via hash or history API. Already built.
- `__.navigate(url)`, `__.historyReplace(url)`, `__.back()`
- `__.matchPath(pattern, path)` → params
- `[route="/path/:param"]` elements auto show/hide
- `[nav]` active class, `*` catch-all
- `routed` event for chaining

### dragdrop
Sortable lists and file drop zones. Already built.
- `[sortable]` makes children draggable
- `[drag-handle]` restricts to handle
- `[dropzone="fn"]` for file drops
- `sorted`, `dropped` events

### modal
Dialogs and modals using `<dialog>` element.
- `__.modal(selector)` — open modal
- `__.modalClose(selector)` — close
- HTML: backdrop, close button, body slot
- `ps-click="__.modal" modal-selector="#confirm"` — open from anywhere
- `opened`, `closed` events
- Esc key closes, click-outside closes
- Stacks (multiple modals)

### tabs
Tab navigation — show one panel at a time.
- `[tabs]` container with `[tab="name"]` triggers and `[tab-panel="name"]` content
- `ps-click` auto-bound on tab triggers
- `__.tab(selector, name)` — activate programmatically
- `tab-changed` event with `__.data.tab.active`
- Active class on trigger, show/hide on panels

### toast
Stacked notification toasts (upgrade from single alert banner).
- `__.toast(msg, type, timeout)` — show toast
- `__.toastSuccess/Error/Warning/Info(msg)`
- Queue/stack positioning (top-right default, configurable)
- Auto-dismiss with progress bar
- Click to dismiss
- HTML template for custom toast layouts

### table
Sortable, filterable, paginated tables from `__.data` arrays.
- `<table ps-use="table" table-readdatapath="users" table-pagesize="20">`
- `<template>` row with `{key}` placeholders (like `populateEach`)
- Column sort: `[sortable]` on `<th>`, click to toggle asc/desc
- Client-side filter: `<input ps-input="__.tableFilter" tableFilter-selector="#my-table">`
- Pagination controls auto-generated
- `__.tableReload(selector)` — re-render from data
- `sorted`, `filtered`, `paged` events

### accordion
Collapsible sections.
- `[accordion]` container, `[accordion-trigger]` headers, `[accordion-panel]` content
- Single-open or multi-open mode
- CSS transitions for open/close
- `__.accordionOpen/Close/Toggle(selector)`
- `opened`, `closed` events

---

## Tier 2 — Common App Features

### autocomplete
Search-as-you-type dropdown for inputs.
- `<input ps-use="autocomplete" autocomplete-url="/api/search" autocomplete-readdatapath="results">`
- Debounced fetch on input, renders dropdown via `<template>`
- Keyboard nav (up/down/enter/esc)
- `autocomplete-minlength="2"`, `autocomplete-delay="300"`
- `autocomplete-valuefield`, `autocomplete-labelfield` for object arrays
- Static array mode: `autocomplete-readdatapath="myList"` (no URL, filter client-side)
- `selected` event with chosen item in `__.data.autocomplete`
- HTML: dropdown container, item template, loading indicator

### infinite-scroll
Lazy load content on scroll.
- `<div ps-use="infinite-scroll" infinite-scroll-url="/api/items?page={page}" infinite-scroll-selector="#list">`
- Intersection Observer on sentinel element
- Auto-increments `{page}` param
- Appends to target via `populateEach` (append mode)
- `__.infiniteReset(selector)` — start over
- Loading indicator while fetching
- Stops when server returns empty array
- `loaded` event per page

### lightbox
Image gallery overlay.
- `<img ps-use="lightbox" src="thumb.jpg" lightbox-src="full.jpg">`
- Groups: `lightbox-group="gallery1"` for prev/next nav
- Keyboard nav, swipe on mobile
- Zoom, caption from `alt` or `lightbox-caption`
- Esc/click-outside closes
- Preloads adjacent images
- HTML: overlay, image container, controls, counter

### carousel
Image/content slider.
- `<div ps-use="carousel">` with `<template>` slides
- `__.carouselNext/Prev/GoTo(selector, index)`
- Auto-play with `carousel-interval="5000"`
- Dot indicators, arrow controls
- Touch/swipe support
- `slide-changed` event
- CSS transitions

### tooltip
Hover/focus tooltips.
- `<button ps-use="tooltip" tooltip-text="Save your work">Save</button>`
- Position: `tooltip-position="top|bottom|left|right"` (auto-flip at edges)
- Delay: `tooltip-delay="300"`
- Rich HTML: `tooltip-html="<b>Bold</b> tip"`
- Arrow pointer
- CSS-only animation

### search
Client-side full-text search with highlighting.
- `<input ps-use="search" search-selector="#content" search-highlight="true">`
- Searches text content of target elements
- Hides non-matching elements (or dims them)
- Highlights matching text with `<mark>`
- `search-minlength="2"`, `search-debounce="200"`
- `__.searchClear(selector)` — remove highlights, show all

### confirm
Confirmation dialogs before destructive actions.
- `<button ps-click="__.confirm, __.delete" confirm-msg="Delete this?" delete-url="/api/item/1">`
- `__.confirm(msg, title)` — promise: resolve on yes, reject on no
- Uses modal plugin internally (dep)
- Customizable yes/no button text
- `confirm-yes="Remove"`, `confirm-no="Keep"`

---

## Tier 3 — Rich Interactions

### richtext
ContentEditable rich text editor.
- `<div ps-use="richtext" contenteditable>`
- HTML template: toolbar with bold/italic/underline/heading/link/list/image buttons
- All toolbar buttons use `ps-click="__.richtext.bold"` etc. — Popstart all the way down
- `__.richtext.getHTML(selector)`, `__.richtext.setHTML(selector, html)`
- `__.richtext.scrape(selector, writedatapath)` — extract HTML to `__.data`
- Paste cleanup (strip Word/Google Docs junk)
- Markdown input mode (optional)
- `changed` event (debounced)

### imgedit
Image cropping, rotation, and basic editing.
- `<div ps-use="imgedit" imgedit-src="/photos/cat.jpg">`
- HTML template: canvas, toolbar (crop/rotate/flip/brightness/contrast)
- `__.imgedit.crop/rotate/flip/resize/brightness/contrast`
- `__.imgedit.save(selector, url)` — upload edited image
- `__.imgedit.getBlob(selector)` — get as Blob for custom upload
- Touch-friendly crop handles
- Aspect ratio lock: `imgedit-ratio="16:9"`
- `saved` event

### calendar
Date picker and calendar view.
- `<input ps-use="calendar" type="text">` — date picker on input
- `<div ps-use="calendar" calendar-mode="month">` — inline calendar
- `__.calendar.setDate(selector, date)`
- `__.calendar.getDate(selector)` → ISO string
- `calendar-min`, `calendar-max` date bounds
- `calendar-format="YYYY-MM-DD"` display format
- Month/year navigation
- `date-selected` event
- Today highlight, selected highlight
- i18n: `calendar-locale="fr"` for day/month names

### colorpicker
Color selection.
- `<input ps-use="colorpicker" type="text" value="#ff0000">`
- HTML template: hue strip, saturation/brightness square, hex/rgb inputs, swatches
- `__.colorpicker.get(selector)` → hex
- `__.colorpicker.set(selector, color)`
- Preset swatches: `colorpicker-swatches="#f00,#0f0,#00f"`
- `color-selected` event
- Eyedropper (where supported via EyeDropper API)

### tree
Tree view with expand/collapse.
- `<div ps-use="tree" tree-readdatapath="fileTree">`
- Data shape: `[{label, children: [...]}]`
- `<template>` for node rendering
- Expand/collapse with CSS transitions
- `__.tree.expand/collapse/toggle(selector, path)`
- Keyboard nav (arrow keys)
- `selected` event with `__.data.tree.selected`
- Lazy children: `tree-url="/api/children?parent={id}"` fetches on expand

### markdown
Render markdown to HTML.
- `<div ps-use="markdown" markdown-src="/docs/readme.md">`
- Or inline: `<div ps-use="markdown">## Hello\nWorld</div>`
- Uses a lightweight markdown parser (~150 lines for basic md)
- Headings, bold, italic, links, images, code blocks, lists, blockquotes, tables
- Syntax highlighting for code blocks (optional dep)
- `__.markdown.render(selector, text)`
- `rendered` event

---

## Tier 4 — Communication & Streaming

### stream
SSE/WS message processing pipeline — filter, transform, dedupe, route.
- `<div ps-use="stream" stream-url="/api/events" stream-type="sse">`
- **Filter by type**: `stream-filter-type="message,notification"` — only process matching `type` field
- **Filter by media**: `stream-filter-media="image/*"` — route media types
- **Dedupe**: `stream-dedupe="id"` — skip messages with duplicate field value
- **Transform**: `stream-transform="transformFn"` — user function to reshape data
- **Route to targets**: `stream-route-message="#chat" stream-route-notification="#alerts"` — different message types render to different selectors
- **Max buffer**: `stream-maxbuffer="500"` — trim oldest when exceeded
- All targets use `populateEach` for rendering
- `__.stream.pause/resume/close(url)`
- `__.stream.getBuffer(url)` → current message array
- `message`, `filtered`, `deduped` events
- Works with both SSE and WebSocket (auto-detects from URL scheme)

### presence
Online/offline presence indicators.
- `<div ps-use="presence" presence-url="wss://example.com/presence">`
- Track user presence via WebSocket heartbeat
- `__.presence.setStatus(status)` — online/away/busy/offline
- `__.presence.getUsers()` → array of online users
- Auto-updates `[presence-user="userId"]` elements with status class
- `presence-heartbeat="30000"` — heartbeat interval
- `presence-timeout="90000"` — consider offline after timeout
- `joined`, `left`, `status-changed` events

### typing
Typing indicators for chat.
- `<div ps-use="typing" typing-url="wss://example.com/typing">`
- `__.typing.start(channel)`, `__.typing.stop(channel)` — send indicator
- Auto-sends on input events, auto-stops after delay
- `typing-selector="#typing-indicator"` — element to show/hide
- `typing-template="{user} is typing..."` — text template
- `typing-timeout="3000"` — stop after idle
- Multiple typers: `"{user1}, {user2} are typing..."`

### notify
Browser push notifications.
- `<div ps-use="notify">`
- `__.notify.request()` — ask permission
- `__.notify.send(title, body, icon)` — show notification
- `__.notify.subscribe(url)` — register service worker push endpoint
- Click-to-action: `notify-click="__.navigate" navigate-url="/messages"`
- Badge count: `__.notify.badge(count)`

---

## Tier 5 — Media

### audio
Audio player with controls.
- `<div ps-use="audio" audio-src="/music/track.mp3">`
- HTML template: play/pause, progress bar, time display, volume
- Playlist mode: `audio-readdatapath="playlist"` from `__.data` array
- `__.audio.play/pause/stop/next/prev/seek(selector)`
- `playing`, `paused`, `ended`, `timeupdate` events
- Waveform visualization (canvas, optional)

### video
Video player with custom controls.
- `<div ps-use="video" video-src="/media/intro.mp4">`
- HTML template: play/pause, progress, fullscreen, volume, speed
- Poster: `video-poster="thumb.jpg"`
- Subtitles: `video-subtitles="/subs/en.vtt"`
- `__.video.play/pause/seek/fullscreen(selector)`
- Picture-in-picture support
- Keyboard shortcuts (space, arrows, f, m)

### camera
Camera/webcam capture.
- `<div ps-use="camera">`
- HTML template: video preview, capture button, flip camera
- `__.camera.start(selector)` — open camera
- `__.camera.capture(selector)` — take photo, returns Blob
- `__.camera.stop(selector)` — close camera
- `camera-facing="user|environment"` — front/back
- `captured` event with image data
- Chain: `ps-click="__.camera.capture, __.upload" upload-url="/api/avatar"`

### recorder
Audio/video recording.
- `<div ps-use="recorder" recorder-type="audio">`
- `__.recorder.start/stop/pause/resume(selector)`
- Chunk streaming: `recorder-url="/api/upload"` — upload chunks as recorded
- `recorder-maxduration="60000"` — auto-stop
- `recorded` event with Blob
- Level meter visualization for audio

---

## Tier 6 — Data & Forms

### form-wizard
Multi-step forms.
- `<div ps-use="form-wizard">` with `[step="1"]`, `[step="2"]` etc.
- `__.wizard.next/prev/goto(selector, step)`
- Validates current step before advancing
- Progress indicator auto-generated
- `__.wizard.scrapeAll(selector)` — scrape all steps
- `step-changed` event
- Back button preserves data

### validate-pro
Advanced form validation beyond HTML5.
- `<input ps-use="validate-pro" validate-rules="email,minlength:5">`
- Built-in rules: `required`, `email`, `url`, `minlength`, `maxlength`, `min`, `max`, `pattern`, `matches` (field comparison), `phone`
- Custom rules: `validate-custom="myValidator"`
- Inline error messages: `validate-msg-email="Not a valid email"`
- Real-time validation on input/blur
- `__.validatePro.check(selector)` — validate all, returns promise
- Error styling via `.ps-invalid` class

### data-table
Server-side paginated, sortable, filterable tables.
- Extends `table` plugin for server-side operations
- `data-table-url="/api/users?page={page}&sort={sort}&filter={filter}"`
- Column definitions via `<th>` attributes
- Server-side search, sort, filter via query params
- Configurable page sizes
- Row selection (single/multi)
- Bulk actions toolbar
- Export (CSV, JSON)

### tags
Tag/chip input.
- `<input ps-use="tags" tags-max="5">`
- Type + enter to add, x to remove
- `tags-suggestions="/api/tags"` — autocomplete (uses autocomplete plugin)
- `tags-readdatapath="form.tags"` — read initial tags from data
- `__.tags.get(selector)` → array of tags
- `__.tags.set(selector, array)`
- Drag to reorder (uses dragdrop plugin)

---

## Tier 7 — Layout & Visual

### masonry
Masonry/waterfall layout.
- `<div ps-use="masonry" masonry-columns="3" masonry-gap="16">`
- Auto-layout children into columns
- Responsive: `masonry-breakpoints='{"768":2,"480":1}'`
- Lazy image loading with Intersection Observer
- Re-layout on window resize (debounced)
- `__.masonry.relayout(selector)` — manual re-layout
- Works with `populateEach` for dynamic content

### theme
Theme switching with CSS custom properties.
- `<div ps-use="theme">`
- `__.theme.set(name)` — apply theme
- `__.theme.toggle()` — light/dark toggle
- Themes defined as CSS files or inline `<style>` in plugin HTML template
- `theme-default="dark"`, `theme-persist="true"` (localStorage)
- System preference detection (prefers-color-scheme)
- `theme-changed` event
- `[theme-toggle]` attribute for toggle buttons

### lazy
Lazy-load images and content.
- `<img ps-use="lazy" lazy-src="real-image.jpg" src="placeholder.jpg">`
- Intersection Observer, loads when near viewport
- Fade-in animation
- `lazy-offset="200"` — load 200px before visible
- Background images: `<div ps-use="lazy" lazy-bg="image.jpg">`
- Content lazy-load: `<div ps-use="lazy" lazy-url="/api/partial">` — fetch HTML on visible

### chart
Simple charts (no D3 dependency).
- `<canvas ps-use="chart" chart-type="bar" chart-readdatapath="salesData">`
- Types: bar, line, pie, donut, sparkline
- Data from `__.data` arrays
- Responsive (redraws on resize)
- `__.chart.update(selector, data)` — update data
- Tooltips on hover
- Labels, legends, axis labels
- Color schemes via `chart-colors`
- Animation on initial render

---

## Tier 8 — Utilities

### i18n
Internationalization.
- `<div ps-use="i18n" i18n-url="/locales/{lang}.json" i18n-default="en">`
- `[i18n="key"]` elements auto-translated
- `__.i18n.t(key, params)` — translate with interpolation
- `__.i18n.setLang(lang)` — switch language, re-renders all `[i18n]` elements
- Language detection from browser
- Persist choice in localStorage
- `language-changed` event
- Pluralization: `i18n-plural="count"`

### a11y
Accessibility helpers.
- `<div ps-use="a11y">`
- Auto-adds ARIA attributes to Popstart elements (role, aria-label, etc.)
- Focus trap for modals (uses modal plugin)
- Skip-to-content link
- Keyboard navigation audit (warns about non-focusable clickable elements)
- High contrast mode toggle
- Screen reader announcements: `__.a11y.announce(text)`
- `[a11y-label]` shorthand for aria-label

### analytics
Event tracking.
- `<div ps-use="analytics" analytics-url="/api/track">`
- Auto-tracks all Popstart event chain executions
- Custom events: `[analytics-event="signup_click"]` on any element
- `__.analytics.track(event, data)` — manual track
- Batched sends (queue + flush every N seconds)
- Page view tracking
- Session tracking (UUID + duration)
- Privacy: `analytics-anonymize="true"` strips PII

### pwa
Progressive Web App setup.
- `<div ps-use="pwa" pwa-manifest="/manifest.json">`
- Auto-registers service worker for offline caching
- Cache strategies: `pwa-strategy="cache-first|network-first|stale-while-revalidate"`
- Install prompt: `__.pwa.installPrompt()` — trigger install banner
- Offline indicator: shows/hides `[pwa-offline]` element
- `offline`, `online` events
- Background sync queue for failed HTTP requests

---

## Plugin Dependency Graph

```
core + extras (guaranteed base)
├── modal (standalone)
│   ├── confirm (needs modal)
│   └── a11y (optional, enhances modal focus trap)
├── router (standalone)
├── dragdrop (standalone)
│   └── tags (optional, for tag reorder)
├── autocomplete (standalone)
│   └── tags (optional, for tag suggestions)
├── table (standalone)
│   └── data-table (extends table)
├── stream (standalone, extends core SSE/WS)
│   ├── presence (uses stream)
│   └── typing (uses stream)
├── tooltip (standalone)
├── toast (standalone)
├── tabs (standalone)
├── accordion (standalone)
├── search (standalone)
├── carousel (standalone)
├── lightbox (standalone)
├── infinite-scroll (standalone)
├── richtext (standalone)
├── imgedit (standalone)
├── calendar (standalone)
├── colorpicker (standalone)
├── tree (standalone)
├── markdown (standalone)
├── form-wizard (standalone)
├── validate-pro (standalone)
├── masonry (standalone)
├── theme (standalone)
├── lazy (standalone)
├── chart (standalone)
├── audio (standalone)
├── video (standalone)
├── camera (standalone)
├── recorder (standalone)
├── i18n (standalone)
├── analytics (standalone)
├── pwa (standalone)
└── notify (standalone)
```

Most plugins are standalone (core + extras only). This is by design — no dependency chains beyond the base.

## Plugin Development Convention

```
/popstart/plugins/myplugin/
  myplugin.js    ← 'use strict'; adds __.myplugin.* or __.*
  myplugin.css   ← .ps-myplugin-* classes, CSS vars for theming
  myplugin.html  ← hidden template with ps-* attributes
```

Rules:
1. Use `__.el()`, `__.show()`, `__.hide()`, etc. — never raw `querySelector`
2. Use `ps-click`, `ps-change`, etc. in HTML templates — Popstart all the way down
3. Fire events for chaining: `__.PopEvent.call(el, {type:'my-event'})`
4. Store state in `__.data.pluginName` namespace
5. Respect `__.config` — read from it, let users override
6. Keep it under 200 lines. If bigger, it's probably two plugins.
