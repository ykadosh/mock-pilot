 
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
    async function inlineFontUrls(cssText, baseUrl) {
      const fontFaceRegex = /@font-face\\s*\\{[^}]*\\}/gi;
      const fontFaces = [...cssText.matchAll(fontFaceRegex)];
      _log("  Found " + fontFaces.length + " @font-face block(s) in CSS (" + cssText.length + " chars)");
      // Pass 1: Collect all unique font URLs
      var urlsToFetch = [];
      var seen = {};
      for (const faceMatch of fontFaces) {
        var faceBlock = faceMatch[0];
        const urlRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
        for (const match of faceBlock.matchAll(urlRegex)) {
          if (match[1].startsWith("data:")) continue;
          try {
            var resolved = new URL(match[1], baseUrl).href;
            if (!seen[resolved] && !_fontCache[resolved]) { seen[resolved] = true; urlsToFetch.push(resolved); }
          } catch (e) {}
        }
        const simpleUrlRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
        for (const match of faceBlock.matchAll(simpleUrlRegex)) {
          if (match[1].startsWith("data:")) continue;
          try {
            var resolved2 = new URL(match[1], baseUrl).href;
            if (!seen[resolved2] && !_fontCache[resolved2]) { seen[resolved2] = true; urlsToFetch.push(resolved2); }
          } catch (e) {}
        }
      }
      // Pass 2: Fetch all unique URLs in parallel
      _log("  Fetching " + urlsToFetch.length + " unique font URL(s) in parallel...");
      await _fetchAllFontsParallel(urlsToFetch);
      // Pass 3: Replace URLs with cached data URIs
      for (const faceMatch of fontFaces) {
        let faceBlock = faceMatch[0];
        const urlRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
        for (const match of faceBlock.matchAll(urlRegex)) {
          if (match[1].startsWith("data:")) continue;
          try {
            var resolvedUrl = new URL(match[1], baseUrl).href;
            var dataUri = _fontCache[resolvedUrl];
            if (dataUri) faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '") format("' + match[2] + '")');
          } catch (e) {}
        }
        const simpleUrlRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
        for (const match of faceBlock.matchAll(simpleUrlRegex)) {
          if (match[1].startsWith("data:")) continue;
          try {
            var resolvedUrl2 = new URL(match[1], baseUrl).href;
            var dataUri2 = _fontCache[resolvedUrl2];
            if (dataUri2) faceBlock = faceBlock.replace(match[0], 'url("' + dataUri2 + '")');
          } catch (e) {}
        }
        cssText = cssText.replace(faceMatch[0], faceBlock);
      }
      return cssText;
    }
`;
