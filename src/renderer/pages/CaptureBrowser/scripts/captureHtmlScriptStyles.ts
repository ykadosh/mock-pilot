export const CAPTURE_HTML_SCRIPT_STYLES = `
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
    _log("[step:layout] Skipping bake/fix/expand passes - capture should behave like a window resize.");
`;
