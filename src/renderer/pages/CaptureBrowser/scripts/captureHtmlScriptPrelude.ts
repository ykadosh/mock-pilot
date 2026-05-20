 
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
