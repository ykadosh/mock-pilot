// Inlined into the picker script's IIFE. Reads/writes closure vars defined there:
// `overlay`, `label`, `hoverOverlay`, `hoverLabel`, `active`.
export const APPLY_FULL_HTML_SCRIPT = `
  function applyFullHtml(newHtml) {
    try {
      var parser = new DOMParser();
      var newDoc = parser.parseFromString(newHtml, 'text/html');
      if (!newDoc || !newDoc.body) return false;

      var scrollX = window.scrollX, scrollY = window.scrollY;

      // Preserve renderer-injected nodes from current head (e.g., <base href>).
      var preservedHead = Array.prototype.slice.call(document.head.querySelectorAll('[data-mp-injected]'));

      var newHead = document.adoptNode(newDoc.head || document.createElement('head'));
      for (var i = preservedHead.length - 1; i >= 0; i--) {
        newHead.insertBefore(preservedHead[i], newHead.firstChild);
      }
      document.head.replaceWith(newHead);

      var newBody = document.adoptNode(newDoc.body);
      document.body.replaceWith(newBody);

      // Closure-captured overlay refs pointed into the old body, which is now detached.
      overlay = null; label = null; hoverOverlay = null; hoverLabel = null;
      active = false;
      document.body.style.cursor = '';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      window.scrollTo(scrollX, scrollY);
      return true;
    } catch (err) { return false; }
  }
`;
