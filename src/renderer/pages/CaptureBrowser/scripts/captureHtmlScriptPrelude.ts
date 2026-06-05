 
export const CAPTURE_HTML_SCRIPT_PRELUDE = `
  (async () => {
    var _heightMode = __HEIGHT_MODE__;
    var _origFetch = window.fetch.bind(window);
    var fetch = function(url, opts) {
      var timeout = 10000;
      var controller = new AbortController();
      var id = setTimeout(function() { controller.abort(); }, timeout);
      var merged = Object.assign({}, opts || {}, { signal: controller.signal });
      return _origFetch(url, merged).finally(function() { clearTimeout(id); });
    };
    var _log = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[Capture]");
      console.log.apply(console, args);
    };
    _log("Capture script running inside webview");
    // Snapshot all CSSOM rules immediately before any DOM mutation can trigger observers.
    // Recurses into @import rules so cross-origin imported stylesheets (e.g. Google Fonts)
    // contribute their @font-face declarations rather than being dropped when <link>/<style>
    // tags are removed later in the pipeline.
    var _cssomSnapshot = [], _visitedSheets = [], _crossOriginSheets = [];
    _log("[step:cssom-snapshot] Snapshotting all stylesheet rules...");
    function _snapshotSheet(sheet, depth, adopted) {
      if (!sheet || depth > 10 || _visitedSheets.indexOf(sheet) !== -1) return;
      _visitedSheets.push(sheet);
      var rules;
      // Cross-origin (no CORS) cssRules access throws SecurityError; fall back to fetch().
      try { rules = sheet.cssRules; } catch (e) { if (sheet.href) _crossOriginSheets.push({ href: sheet.href, adopted: !!adopted }); return; }
      if (!rules || rules.length === 0) return;
      var topLevelRules = [];
      for (var _ri = 0; _ri < rules.length; _ri++) {
        var _rule = rules[_ri], _isImport = false;
        try { _isImport = (_rule.type === 3); } catch (e) {}
        if (_isImport) {
          var _imported = null; try { _imported = _rule.styleSheet; } catch (e) {}
          var _accessible = false; if (_imported) { try { _accessible = !!_imported.cssRules; } catch (e) {} }
          // Inline the imported sheet; @import directive kept only if sheet is cross-origin/inaccessible.
          if (_accessible) { _snapshotSheet(_imported, depth + 1, false); continue; }
        }
        try { topLevelRules.push(_rule.cssText); } catch (e) {}
      }
      if (topLevelRules.length > 0) _cssomSnapshot.push({ href: sheet.href || null, rules: topLevelRules, adopted: !!adopted });
    }
    for (var _si = 0; _si < document.styleSheets.length; _si++) _snapshotSheet(document.styleSheets[_si], 0, false);
    if (document.adoptedStyleSheets) for (var _ai = 0; _ai < document.adoptedStyleSheets.length; _ai++) _snapshotSheet(document.adoptedStyleSheets[_ai], 0, true);
    if (_crossOriginSheets.length > 0) {
      var _seenHref = {}, _uniqueCors = [];
      for (var _ci = 0; _ci < _crossOriginSheets.length; _ci++) {
        var _it = _crossOriginSheets[_ci];
        if (!_seenHref[_it.href]) { _seenHref[_it.href] = true; _uniqueCors.push(_it); }
      }
      _log("[step:cssom-cors] Fetching " + _uniqueCors.length + " cross-origin stylesheet(s) (cssRules blocked)...");
      await Promise.all(_uniqueCors.map(async function(item) {
        try {
          var res = await fetch(item.href);
          if (!res.ok) return _log("  Fetch failed " + res.status + ": " + item.href);
          var text = await res.text();
          if (text) _cssomSnapshot.push({ href: item.href, rules: [text], adopted: item.adopted });
        } catch (e) { _log("  Cross-origin fetch failed: " + item.href + " - " + (e && e.message || e)); }
      }));
    }
    _log("Snapshotted " + _cssomSnapshot.length + " stylesheet(s) with " + _cssomSnapshot.reduce(function(a,b){return a+b.rules.length;},0) + " total rules");
`;
