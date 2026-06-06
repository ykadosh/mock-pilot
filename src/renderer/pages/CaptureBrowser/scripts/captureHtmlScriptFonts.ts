export const CAPTURE_HTML_SCRIPT_FONTS = `
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
      // Prefer woff2 > woff, falling back to truetype/opentype so TTF/OTF-only
      // declarations (common on Hebrew/Arabic sites) are preserved instead of dropped.
      var _preferred = ["woff2", "woff", "truetype", "opentype"];
      for (var _pi = 0; _pi < _preferred.length; _pi++) {
        var _found = candidates.find(function(c) { return c.format === _preferred[_pi]; });
        if (_found) return _found;
      }
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
      // Pass 3: Rebuild @font-face blocks with only the inlined font. If a face had no
      // supported url() at all, drop it. If the fetch failed (e.g. CORS), keep the
      // original block so the iframe can attempt the request at render time.
      var removedCount = 0;
      var keptOriginalCount = 0;
      for (var _fi = 0; _fi < fontFaces.length; _fi++) {
        var faceMatch = fontFaces[_fi];
        var best = bestPerFace[_fi];
        if (!best) { cssText = cssText.replace(faceMatch[0], ""); removedCount++; continue; }
        var dataUri = _fontCache[best.url];
        if (!dataUri) { keptOriginalCount++; continue; }
        // Rewrite the src: property to only include the successfully fetched font
        var faceBlock = faceMatch[0];
        var newSrc = 'src: url("' + dataUri + '") format("' + best.format + '")';
        faceBlock = faceBlock.replace(/src:\\s*[^;]+;?/i, newSrc + ";");
        cssText = cssText.replace(faceMatch[0], faceBlock);
      }
      if (removedCount > 0) _log("  Removed " + removedCount + " @font-face block(s) with no supported format");
      if (keptOriginalCount > 0) _log("  Kept " + keptOriginalCount + " @font-face block(s) with original src (fetch failed)");
      return cssText;
    }
`;
