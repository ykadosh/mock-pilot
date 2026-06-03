// Re-point each <picture><img> at the highest-viewport <source> URL.
// Captures happen at the webview's current width, which on responsive sites
// (e.g. Microsoft.com) often loads a mobile/portrait variant whose aspect
// ratio makes the hero render absurdly tall when later viewed at desktop
// widths. We pick the URL behind the source with the largest min-width
// media query so the asset extractor downloads a desktop-appropriate image.
export const CAPTURE_HTML_SCRIPT_PICTURE_SOURCES = `
    _log("[step:picture-sources] Upgrading <picture> <img> to widest-viewport <source>...");
    var _pictures = document.querySelectorAll('picture');
    var _pictureUpgradeCount = 0;
    for (var _pi = 0; _pi < _pictures.length; _pi++) {
      var _picEl = _pictures[_pi];
      var _picImg = _picEl.querySelector('img');
      if (!_picImg) continue;
      var _sources = _picEl.querySelectorAll('source');
      if (_sources.length === 0) continue;
      var _bestUrl = null, _bestRank = -1;
      for (var _psi = 0; _psi < _sources.length; _psi++) {
        var _src = _sources[_psi];
        var _srcset = _src.getAttribute('srcset') || _src.getAttribute('src') || '';
        if (!_srcset) continue;
        var _candidateUrl = _srcset.split(',')[0].trim().split(/\\s+/)[0];
        if (!_candidateUrl) continue;
        var _media = _src.getAttribute('media') || '';
        var _mwMatch = _media.match(/min-width:\\s*(\\d+)/);
        var _rank = _mwMatch ? parseInt(_mwMatch[1], 10) : 0;
        if (_rank > _bestRank) { _bestRank = _rank; _bestUrl = _candidateUrl; }
      }
      if (_bestUrl) {
        try { _bestUrl = new URL(_bestUrl, document.baseURI).href; } catch (e) {}
        if (_bestUrl !== _picImg.src) {
          _picImg.removeAttribute('srcset');
          _picImg.removeAttribute('sizes');
          _picImg.src = _bestUrl;
          _pictureUpgradeCount++;
        }
      }
    }
    _log("Upgraded " + _pictureUpgradeCount + " <picture> <img> source(s) to widest viewport");
`;
