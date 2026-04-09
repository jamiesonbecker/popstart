/**
 * widget-loader.js — The only script a widget page needs.
 *
 * A widget file is just:
 *   <!DOCTYPE html>
 *   <script src="../../js/widget-loader.js"></script>
 *   <div class="tab-bar">...your widget HTML...</div>
 *
 * This script handles EVERYTHING else:
 *   - Loads Popstart (core + extras)
 *   - Loads the widget's own CSS (widget.css in same dir) and JS (widget.js)
 *   - Detects context: standalone page vs. gallery-injected
 *   - Standalone: injects head/meta, theme, chrome (header, theme toggle,
 *     code editor, viewport switcher, export)
 *   - Gallery: skips all chrome (parent already has Popstart + CSS loaded)
 *
 * Gallery integration:
 *   Gallery fetches widget.html, strips the <script> tag, and appends the
 *   remaining HTML to DOM. Sets window.__popstartGallery = true so if the
 *   loader somehow runs, it bails immediately.
 */
;(function() {
  'use strict';

  // ── Gallery context detection ──
  // If the gallery already loaded us via XHR+append, bail.
  if (window.__popstartGallery) return;

  // Determine paths relative to this script
  var scripts = document.getElementsByTagName('script');
  var me = scripts[scripts.length - 1];
  var loaderSrc = me.src || '';
  var baseDir = loaderSrc.substring(0, loaderSrc.lastIndexOf('/') + 1) || './';
  // Widget dir = directory of the current HTML file
  var widgetDir = location.href.substring(0, location.href.lastIndexOf('/') + 1);

  // ── Theme (before paint) ──
  var saved = localStorage.getItem('ps-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  // ── Inject <head> essentials ──
  var head = document.head || document.getElementsByTagName('head')[0] || document.createElement('head');
  if (!document.head) document.documentElement.insertBefore(head, document.documentElement.firstChild);

  function addMeta(name, content) {
    if (!head.querySelector('meta[name="' + name + '"]')) {
      var m = document.createElement('meta');
      if (name === 'charset') m.setAttribute('charset', content);
      else { m.name = name; m.content = content; }
      head.appendChild(m);
    }
  }
  if (!head.querySelector('meta[charset]')) { var mc = document.createElement('meta'); mc.setAttribute('charset', 'utf-8'); head.insertBefore(mc, head.firstChild); }
  if (!head.querySelector('meta[name=viewport]')) addMeta('viewport', 'width=device-width,initial-scale=1');

  // ── Load stylesheets ──
  function loadCss(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    head.appendChild(link);
    return link;
  }

  // Base widget styles (themes, reset, chrome)
  loadCss(baseDir + 'widget-base.css');

  // Widget's own CSS (same directory as widget.html)
  var widgetCssLink = loadCss(widgetDir + 'widget.css');
  widgetCssLink.onerror = function() { this.remove(); }; // optional file

  // ── Load scripts ──
  var scriptsToLoad = [
    baseDir + '../popstart-core.js',
    baseDir + '../popstart-extras.js'
  ];
  var loaded = 0;

  function onScriptLoad() {
    loaded++;
    if (loaded < scriptsToLoad.length) return;
    // All scripts loaded — init
    if (typeof __ !== 'undefined' && __.Popstart) __.Popstart();
    injectChrome();
    // Load widget's own JS (optional)
    var wjs = document.createElement('script');
    wjs.src = widgetDir + 'widget.js';
    wjs.onerror = function() { this.remove(); };
    document.body.appendChild(wjs);
  }

  scriptsToLoad.forEach(function(src) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = onScriptLoad;
    s.onerror = onScriptLoad; // continue even if one fails
    head.appendChild(s);
  });

  // ── Standalone chrome ──
  function injectChrome() {
    // Determine widget name from directory name
    var parts = widgetDir.replace(/\/$/, '').split('/');
    var widgetName = parts[parts.length - 1] || 'widget';
    document.title = widgetName + ' — Popstart Widget';

    // Header
    var header = document.createElement('div');
    header.className = 'wp-header';
    header.innerHTML =
      '<a class="wp-back" href="' + baseDir + '../widget.html?w=' + encodeURIComponent(widgetName) + '">' +
        '&#8592; ' + widgetName +
      '</a>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<button class="wp-btn" onclick="wpCycleTheme()" title="Theme">&#9790;</button>' +
        '<button class="wp-btn" onclick="wpToggleEditor()" title="Code editor">&#60;/&#62;</button>' +
        '<span class="wp-logo">Popstart</span>' +
      '</div>';
    document.body.insertBefore(header, document.body.firstChild);

    // Wrap existing body content in a container
    var content = document.createElement('div');
    content.className = 'wp';
    content.id = 'wp-content';
    while (document.body.children.length > 1) {
      var child = document.body.children[1]; // skip header
      content.appendChild(child);
    }
    document.body.appendChild(content);

    // Code editor panel (hidden by default)
    var editor = document.createElement('div');
    editor.className = 'wp-editor hidden';
    editor.id = 'wp-editor';
    editor.innerHTML =
      '<div class="wp-editor-bar">' +
        '<span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--fg3)">Source</span>' +
        '<div style="display:flex;gap:4px">' +
          '<button class="wp-btn wp-vp-btn active" data-vp="full" onclick="wpSetViewport(this)">Full</button>' +
          '<button class="wp-btn wp-vp-btn" data-vp="tablet" onclick="wpSetViewport(this)">768px</button>' +
          '<button class="wp-btn wp-vp-btn" data-vp="mobile" onclick="wpSetViewport(this)">375px</button>' +
        '</div>' +
      '</div>' +
      '<textarea class="wp-textarea" id="wp-html" spellcheck="false"></textarea>' +
      '<div style="display:flex;gap:4px;padding:8px">' +
        '<button class="wp-btn" onclick="wpRunCode()">&#9654; Run</button>' +
        '<button class="wp-btn" onclick="wpCopyCode()">Copy</button>' +
      '</div>';
    document.body.appendChild(editor);

    // Populate editor with current widget HTML
    var ta = document.getElementById('wp-html');
    if (ta && content) ta.value = content.innerHTML.trim();

    // Editor functions
    window.wpToggleEditor = function() {
      editor.classList.toggle('hidden');
    };
    window.wpRunCode = function() {
      var html = document.getElementById('wp-html').value;
      content.innerHTML = html;
      if (typeof __ !== 'undefined' && __.Popstart) __.Popstart();
    };
    window.wpCopyCode = function() {
      var ta = document.getElementById('wp-html');
      ta.select();
      document.execCommand('copy');
    };
    window.wpSetViewport = function(btn) {
      var vp = btn.dataset.vp;
      document.querySelectorAll('.wp-vp-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      content.style.maxWidth = vp === 'tablet' ? '768px' : vp === 'mobile' ? '375px' : '';
      content.style.margin = vp !== 'full' ? '0 auto' : '';
      content.style.borderLeft = vp !== 'full' ? '1px dashed var(--card-border)' : '';
      content.style.borderRight = vp !== 'full' ? '1px dashed var(--card-border)' : '';
    };
    window.wpCycleTheme = function() {
      var themes = ['darkglass', 'lightglass', 'midnight'];
      var cur = document.documentElement.getAttribute('data-theme') || 'darkglass';
      var next = themes[(themes.indexOf(cur) + 1) % themes.length];
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ps-theme', next);
    };
  }
})();
