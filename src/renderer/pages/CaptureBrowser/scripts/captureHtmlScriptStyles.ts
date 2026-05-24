export const CAPTURE_HTML_SCRIPT_STYLES = `
    _log("[step:scripts] Removing scripts...");
    document.querySelectorAll("script").forEach((s) => s.remove());
    document.querySelectorAll("noscript").forEach((s) => s.remove());
    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="modulepreload"], link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    _log("[step:cssom] Restoring CSSOM from pre-capture snapshot...");
    // Remove all existing <style> and remaining <link rel=stylesheet> elements
    // and replace with the snapshot we took before any DOM mutations
    document.querySelectorAll("style").forEach(function(s) { s.remove(); });
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function(l) { l.remove(); });
    var _snapshotInjected = 0;
    for (var _ssi = 0; _ssi < _cssomSnapshot.length; _ssi++) {
      var _snap = _cssomSnapshot[_ssi];
      if (_snap.rules.length === 0) continue;
      var _newStyle = document.createElement("style");
      if (_snap.adopted) _newStyle.setAttribute("data-adopted-stylesheet", "true");
      if (_snap.href) _newStyle.setAttribute("data-original-href", _snap.href);
      _newStyle.textContent = _snap.rules.join("\\n");
      document.head.appendChild(_newStyle);
      _snapshotInjected++;
    }
    _log("Injected " + _snapshotInjected + " stylesheet(s) from snapshot");
    const inlineStyles = [...document.querySelectorAll("style")];
    const fontStyles = inlineStyles.filter(function(s) { return (s.textContent || "").indexOf("@font-face") !== -1; });
    _log("[step:fonts] Processing " + fontStyles.length + " of " + inlineStyles.length + " inline style tag(s) that contain @font-face...");
    await Promise.all(fontStyles.map(async function(style) {
      var baseUrl = style.getAttribute("data-original-href") || document.baseURI;
      style.textContent = await inlineFontUrls(style.textContent || "", baseUrl);
    }));
    _log("Done processing inline style tags");
    _log("[step:layout] Processing layout (bake, viewport heights, scrollable containers)...");
    var bakeCount = 0;
    var heightFixCount = 0;
    var expandCount = 0;
    var vpHeight = window.innerHeight;
    function _bakeHeight(el) {
      var cs = getComputedStyle(el);
      if (el.style.height && el.style.height.endsWith('px')) return;
      if ((cs.position === 'absolute' || cs.position === 'fixed') && cs.top !== 'auto' && cs.bottom !== 'auto') {
        var rect = el.getBoundingClientRect();
        if (rect.height > 0) {
          el.style.height = rect.height + 'px';
          bakeCount++;
        }
      }
    }
    function _fixViewportHeight(el) {
      if (_heightMode === 'keep-as-is') return;
      if (!el.style.height || !el.style.height.endsWith('px')) return;
      var h = parseFloat(el.style.height);
      if (isNaN(h) || h <= 0) return;
      var rect = el.getBoundingClientRect();
      var bottomGap = Math.abs((rect.top + h) - vpHeight);
      if (bottomGap < 30 && h > vpHeight * 0.3) {
        var offset = Math.round(rect.top);
        if (_heightMode === 'convert-vh') {
          el.style.height = offset > 0 ? 'calc(100vh - ' + offset + 'px)' : '100vh';
        } else {
          el.style.removeProperty('height');
        }
        heightFixCount++;
      }
    }
    function _expandScrollable(el) {
      var cs = getComputedStyle(el);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        var extra = el.scrollHeight - el.clientHeight;
        if (extra > 10) {
          el.style.height = el.scrollHeight + 'px';
          el.style.maxHeight = 'none';
          el.style.overflowY = 'visible';
          expandCount++;
        }
      }
    }
    document.querySelectorAll('*').forEach(function(el) {
      _bakeHeight(el);
      _fixViewportHeight(el);
      _expandScrollable(el);
    });
    _log("Baked " + bakeCount + " viewport-dependent dimension(s), fixed " + heightFixCount + " viewport-derived height(s), expanded " + expandCount + " scrollable container(s)");
`;
