// Inline shadow DOM as Declarative Shadow DOM templates so the iframe
// srcDoc parser can rehydrate them. Without this, web components that
// render into shadow DOM (e.g. <cascade-stories-carousel>) capture as
// empty hosts because outerHTML never traverses shadow roots.
export const CAPTURE_HTML_SCRIPT_SHADOW_DOM = `
    _log("[step:shadow-dom] Inlining open shadow roots as declarative templates...");
    var _shadowCount = 0;
    function _inlineShadowRoots(root) {
      var elements;
      try { elements = root.querySelectorAll('*'); } catch (e) { return; }
      for (var _shi = 0; _shi < elements.length; _shi++) {
        var _host = elements[_shi];
        var _sr = _host.shadowRoot;
        if (!_sr) continue;
        // Recurse into nested shadow roots first so they are baked before the parent moves them.
        _inlineShadowRoots(_sr);
        var _tpl = document.createElement('template');
        _tpl.setAttribute('shadowrootmode', 'open');
        // Inline adopted stylesheets so scoped styles survive serialization.
        if (_sr.adoptedStyleSheets && _sr.adoptedStyleSheets.length) {
          for (var _asi = 0; _asi < _sr.adoptedStyleSheets.length; _asi++) {
            var _styleEl = document.createElement('style');
            var _css = '';
            try {
              var _rules = _sr.adoptedStyleSheets[_asi].cssRules;
              for (var _ri2 = 0; _ri2 < _rules.length; _ri2++) _css += _rules[_ri2].cssText + '\\n';
            } catch (e) {}
            if (_css) { _styleEl.textContent = _css; _tpl.content.appendChild(_styleEl); }
          }
        }
        while (_sr.firstChild) _tpl.content.appendChild(_sr.firstChild);
        _host.insertBefore(_tpl, _host.firstChild);
        _shadowCount++;
      }
    }
    _inlineShadowRoots(document);
    _log("Inlined " + _shadowCount + " shadow root(s) as declarative templates");
`;
