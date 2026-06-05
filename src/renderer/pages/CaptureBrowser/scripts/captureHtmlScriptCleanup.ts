 
export const CAPTURE_HTML_SCRIPT_CLEANUP = `
    _log("[step:scripts] Removing scripts and prefetch links...");
    document.querySelectorAll("script,noscript").forEach((s) => s.remove());
    document.querySelectorAll('link[rel="preload"],link[rel="prefetch"],link[rel="preconnect"],link[rel="dns-prefetch"],link[rel="modulepreload"],link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    _log("[step:cleanup] Stripping non-visual attributes and pruning redundant elements...");
    var _mpDataAttrs = ['data-original-href', 'data-adopted-stylesheet', 'data-mp-crop-trail'];
    var _preservedAriaAttrs = {
      'aria-expanded': 1, 'aria-hidden': 1, 'aria-selected': 1,
      'aria-current': 1, 'aria-checked': 1, 'aria-pressed': 1, 'aria-disabled': 1
    };
    var _strippedCount = 0;
    var _prunedCount = 0;
    function _stripAttrs(el) {
      var toRemove = [];
      for (var i = 0; i < el.attributes.length; i++) {
        var name = el.attributes[i].name;
        if (name.startsWith('aria-')) {
          if (!_preservedAriaAttrs[name]) toRemove.push(name);
          continue;
        }
        if ((name.startsWith('data-') && _mpDataAttrs.indexOf(name) === -1) ||
            name === 'role' || name === 'tabindex' || name === 'draggable' ||
            name === 'contenteditable' || name === 'title') {
          toRemove.push(name);
        }
      }
      toRemove.forEach(function(attr) { el.removeAttribute(attr); });
      _strippedCount += toRemove.length;
    }
    document.querySelectorAll('body *').forEach(function(el) { _stripAttrs(el); });
    // Bottom-up pruning of redundant (visually empty) elements. Walking from
    // deepest-last to shallowest-first lets the removal of a leaf cascade so
    // that a now-empty ancestor becomes eligible for pruning in the same pass.
    var _REPLACED_TAGS = { IMG: 1, VIDEO: 1, CANVAS: 1, IFRAME: 1, SVG: 1, INPUT: 1,
      TEXTAREA: 1, SELECT: 1, AUDIO: 1, PICTURE: 1, SOURCE: 1, OBJECT: 1, EMBED: 1,
      HR: 1, BR: 1, OPTION: 1 };
    function _hasVisualStyle(cs) {
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
      var bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return true;
      if (cs.boxShadow && cs.boxShadow !== 'none') return true;
      var sides = ['Top', 'Right', 'Bottom', 'Left'];
      for (var i = 0; i < 4; i++) {
        var w = parseFloat(cs['border' + sides[i] + 'Width']);
        var style = cs['border' + sides[i] + 'Style'];
        if (w > 0 && style && style !== 'none' && style !== 'hidden') return true;
      }
      var ow = parseFloat(cs.outlineWidth);
      if (ow > 0 && cs.outlineStyle && cs.outlineStyle !== 'none') return true;
      return false;
    }
    function _hasNonWhitespaceText(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent && /\\S/.test(n.textContent)) return true;
      }
      return false;
    }
    function _shouldPrune(el) {
      var tag = el.tagName;
      // Don't descend into SVG subtrees: SVG layout/getComputedStyle is unreliable
      // and SVG content is part of the visual. The SVG root itself is handled
      // below via the replaced-element branch so a 0x0 svg can still be pruned.
      if (el.ownerSVGElement) return false;
      // Replaced elements (and the SVG root): their subtree renders inside
      // their own box, so a 0x0 bounding rect means nothing visible.
      if (_REPLACED_TAGS[tag]) {
        var rRect;
        try { rRect = el.getBoundingClientRect(); } catch (e) { rRect = null; }
        if (rRect && (rRect.width === 0 || rRect.height === 0)) return true;
        return false;
      }
      var cs;
      try { cs = getComputedStyle(el); } catch (e) { return false; }
      if (cs.display === 'none') return true;
      var hasChildElement = el.children.length > 0;
      // visibility:hidden / opacity:0 with no visible descendants -> prune
      if (!hasChildElement && cs.visibility === 'hidden') return true;
      if (!hasChildElement && parseFloat(cs.opacity) === 0) {
        var anim = cs.animationName;
        var trans = cs.transitionProperty || '';
        var hasReveal = (anim && anim !== 'none') ||
          trans === 'all' || trans.indexOf('opacity') !== -1;
        if (!hasReveal) return true;
      }
      // Elements with visible (element) descendants are always preserved.
      if (hasChildElement) return false;
      // Last-resort dimension check: a childless element occupying zero
      // width or height contributes nothing visually, regardless of its
      // text content or visual styling. Runs after all cheap checks.
      var rect;
      try { rect = el.getBoundingClientRect(); } catch (e) { rect = null; }
      if (rect && (rect.width === 0 || rect.height === 0)) return true;
      // Has meaningful text content -> preserve
      if (_hasNonWhitespaceText(el)) return false;
      // Empty element with no visual styling -> prune
      if (!_hasVisualStyle(cs)) return true;
      return false;
    }
    var _allEls = Array.prototype.slice.call(document.querySelectorAll('body *'));
    for (var _pi = _allEls.length - 1; _pi >= 0; _pi--) {
      var _pel = _allEls[_pi];
      if (!_pel.isConnected) continue;
      if (_pel === document.body) continue;
      try {
        if (_shouldPrune(_pel)) {
          _pel.remove();
          _prunedCount++;
        }
      } catch (e) { /* ignore */ }
    }
    _log("Stripped " + _strippedCount + " non-visual attribute(s), pruned " + _prunedCount + " redundant element(s)");
    _log("Removing HTML comments...");
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    _log("Collapsing whitespace...");
    const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    textNodes.forEach((t) => {
      if (t.textContent && /^\\s+$/.test(t.textContent)) {
        var ancestor = t.parentElement;
        while (ancestor) {
          if (ancestor.tagName === "PRE") return;
          ancestor = ancestor.parentElement;
        }
        t.textContent = "\\n";
      }
    });
    _log("Flattening nested interactive elements...");
    var flattenCount = 0;
    document.querySelectorAll('button button, a a').forEach(function(inner) {
      var replacement = document.createElement('span');
      replacement.setAttribute('data-mp-tag', inner.tagName.toLowerCase());
      Array.from(inner.attributes).forEach(function(attr) { replacement.setAttribute(attr.name, attr.value); });
      while (inner.firstChild) replacement.appendChild(inner.firstChild);
      inner.parentNode.replaceChild(replacement, inner);
      flattenCount++;
    });
    if (flattenCount) _log("Flattened " + flattenCount + " nested interactive element(s)");
    var vpMeta = document.createElement('meta');
    vpMeta.name = 'mp-viewport-height';
    vpMeta.content = String(window.innerHeight);
    document.head.appendChild(vpMeta);
    _log("Capture script complete, returning HTML (" + document.documentElement.outerHTML.length + " chars)");
    return document.documentElement.outerHTML;
  })()
`;
