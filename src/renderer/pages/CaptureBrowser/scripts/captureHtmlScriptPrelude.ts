 
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
    async function inlineFontUrls(cssText, baseUrl) {
      const fontFaceRegex = /@font-face\\s*\\{[^}]*\\}/gi;
      const fontFaces = [...cssText.matchAll(fontFaceRegex)];
      _log("  Found " + fontFaces.length + " @font-face block(s) in CSS (" + cssText.length + " chars)");
      for (const faceMatch of fontFaces) {
        let faceBlock = faceMatch[0];
        const urlRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
        const urlMatches = [...faceBlock.matchAll(urlRegex)];
        for (const match of urlMatches) {
          const fontUrl = match[1];
          if (fontUrl.startsWith("data:")) continue;
          const resolvedUrl = new URL(fontUrl, baseUrl).href;
          const dataUri = await _fetchFontAsDataUri(resolvedUrl);
          if (dataUri) faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '") format("' + match[2] + '")');
        }
        const simpleUrlRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
        const simpleMatches = [...faceBlock.matchAll(simpleUrlRegex)];
        for (const match of simpleMatches) {
          const fontUrl = match[1];
          if (fontUrl.startsWith("data:")) continue;
          const resolvedUrl = new URL(fontUrl, baseUrl).href;
          const dataUri = await _fetchFontAsDataUri(resolvedUrl);
          if (dataUri) faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '")');
        }
        cssText = cssText.replace(faceMatch[0], faceBlock);
      }
      return cssText;
    }
`;
