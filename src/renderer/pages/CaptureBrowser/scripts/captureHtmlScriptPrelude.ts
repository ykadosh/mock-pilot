 
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
    // Snapshot all CSSOM rules immediately before any DOM mutation can trigger observers
    var _cssomSnapshot = [];
    _log("[step:cssom-snapshot] Snapshotting all stylesheet rules...");
    for (var _si = 0; _si < document.styleSheets.length; _si++) {
      try {
        var _sheet = document.styleSheets[_si];
        if (_sheet.cssRules && _sheet.cssRules.length > 0) {
          var _rules = [];
          for (var _ri = 0; _ri < _sheet.cssRules.length; _ri++) _rules.push(_sheet.cssRules[_ri].cssText);
          _cssomSnapshot.push({ href: _sheet.href || null, rules: _rules });
        }
      } catch (e) { /* cross-origin sheet, will be fetched later */ }
    }
    if (document.adoptedStyleSheets) {
      for (var _ai = 0; _ai < document.adoptedStyleSheets.length; _ai++) {
        try {
          var _as = document.adoptedStyleSheets[_ai];
          if (_as.cssRules && _as.cssRules.length > 0) {
            var _ar = [];
            for (var _ari = 0; _ari < _as.cssRules.length; _ari++) _ar.push(_as.cssRules[_ari].cssText);
            _cssomSnapshot.push({ href: null, rules: _ar, adopted: true });
          }
        } catch (e) {}
      }
    }
    _log("Snapshotted " + _cssomSnapshot.length + " stylesheet(s) with " + _cssomSnapshot.reduce(function(a,b){return a+b.rules.length;},0) + " total rules");
    var _fontCache = {};
    async function _fetchFontAsDataUri(resolvedUrl) {
      if (_fontCache[resolvedUrl] !== undefined) return _fontCache[resolvedUrl];
      try {
        var res = await fetch(resolvedUrl);
        if (res.ok) {
          var blob = await res.blob();
          var dataUri = await new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onloadend = function() { resolve(reader.result); };
            reader.readAsDataURL(blob);
          });
          _fontCache[resolvedUrl] = dataUri;
          return dataUri;
        }
      } catch (e) {
        _log("  Font fetch failed: " + resolvedUrl + " - " + (e && e.message || e));
      }
      _fontCache[resolvedUrl] = null;
      return null;
    }
    async function _fetchAllFontsParallel(urls) {
      var CONCURRENCY = 6;
      var queue = urls.slice();
      async function worker() {
        while (queue.length > 0) {
          var url = queue.shift();
          if (url) await _fetchFontAsDataUri(url);
        }
      }
      var workers = [];
      for (var _wi = 0; _wi < Math.min(CONCURRENCY, queue.length); _wi++) workers.push(worker());
      await Promise.all(workers);
    }
    function _pickBestFontUrl(faceBlock, baseUrl) {
      // Extract all font URLs with their format from a @font-face block
      var candidates = [];
      const fmtRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
      for (const m of faceBlock.matchAll(fmtRegex)) {
        if (m[1].startsWith("data:")) continue;
        try { candidates.push({ url: new URL(m[1], baseUrl).href, format: m[2], match: m[0] }); } catch (e) {}
      }
      const simpleRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
      for (const m of faceBlock.matchAll(simpleRegex)) {
        if (m[1].startsWith("data:")) continue;
        try {
          var resolved = new URL(m[1], baseUrl).href;
          if (!candidates.some(function(c) { return c.url === resolved; })) {
            var ext = resolved.split("?")[0].split(".").pop().toLowerCase();
            var fmt = ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "eot" ? "embedded-opentype" : "truetype";
            candidates.push({ url: resolved, format: fmt, match: m[0] });
          }
        } catch (e) {}
      }
      // Prefer woff2, then woff — skip eot/truetype/opentype entirely
      var woff2 = candidates.find(function(c) { return c.format === "woff2"; });
      if (woff2) return woff2;
      var woff = candidates.find(function(c) { return c.format === "woff"; });
      if (woff) return woff;
      return null;
    }
    async function inlineFontUrls(cssText, baseUrl) {
      const fontFaceRegex = /@font-face\\s*\\{[^}]*\\}/gi;
      const fontFaces = [...cssText.matchAll(fontFaceRegex)];
      _log("  Found " + fontFaces.length + " @font-face block(s) in CSS (" + cssText.length + " chars)");
      // Pass 1: Collect best (woff2/woff) URL per @font-face block
      var urlsToFetch = [];
      var seen = {};
      var bestPerFace = [];
      for (const faceMatch of fontFaces) {
        var best = _pickBestFontUrl(faceMatch[0], baseUrl);
        bestPerFace.push(best);
        if (best && !seen[best.url] && !_fontCache[best.url]) {
          seen[best.url] = true;
          urlsToFetch.push(best.url);
        }
      }
      // Pass 2: Fetch selected URLs in parallel
      _log("  Fetching " + urlsToFetch.length + " font URL(s) (woff2 preferred)...");
      await _fetchAllFontsParallel(urlsToFetch);
      // Pass 3: Rebuild @font-face blocks with only the inlined font
      var removedCount = 0;
      for (var _fi = 0; _fi < fontFaces.length; _fi++) {
        var faceMatch = fontFaces[_fi];
        var best = bestPerFace[_fi];
        if (!best) { cssText = cssText.replace(faceMatch[0], ""); removedCount++; continue; }
        var dataUri = _fontCache[best.url];
        if (!dataUri) { cssText = cssText.replace(faceMatch[0], ""); removedCount++; continue; }
        // Rewrite the src: property to only include the successfully fetched font
        var faceBlock = faceMatch[0];
        var newSrc = 'src: url("' + dataUri + '") format("' + best.format + '")';
        faceBlock = faceBlock.replace(/src:\\s*[^;]+;?/i, newSrc + ";");
        cssText = cssText.replace(faceMatch[0], faceBlock);
      }
      if (removedCount > 0) _log("  Removed " + removedCount + " @font-face block(s) with no supported format");
      return cssText;
    }
`;
