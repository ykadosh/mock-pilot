/* eslint-disable no-useless-escape */
export const CAPTURE_HTML_SCRIPT_CLEANUP = `
    _log("[step:cleanup] Removing HTML comments...");
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());
    _log("Removing hidden elements...");
    document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => el.remove());
    _log("Collapsing whitespace...");
    const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    textNodes.forEach((t) => {
      if (t.textContent && /^\s+$/.test(t.textContent)) {
        var ancestor = t.parentElement;
        while (ancestor) {
          if (ancestor.tagName === "PRE") return;
          ancestor = ancestor.parentElement;
        }
        t.textContent = "\n";
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
