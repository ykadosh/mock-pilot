export const RESIZE_SCRIPT = `
(function() {
  function reportHeight() {
    var htmlEl = document.documentElement;
    var bodyEl = document.body;
    var savedH = [htmlEl.style.height, bodyEl.style.height];
    var savedMinH = [htmlEl.style.minHeight, bodyEl.style.minHeight];
    htmlEl.style.height = 'auto';
    bodyEl.style.height = 'auto';
    htmlEl.style.minHeight = '0';
    bodyEl.style.minHeight = '0';
    htmlEl.style.overflow = 'visible';
    bodyEl.style.overflow = 'visible';

    var h = Math.max(htmlEl.scrollHeight, bodyEl.scrollHeight);
    var children = bodyEl.children;
    for (var i = 0; i < children.length; i++) {
      var cs = getComputedStyle(children[i]);
      if (cs.position === 'absolute' || cs.position === 'fixed') {
        h = Math.max(h, children[i].getBoundingClientRect().bottom);
      }
    }

    var vpMeta = document.querySelector('meta[name="mp-viewport-height"]');
    var capturedHeight = vpMeta ? parseInt(vpMeta.content, 10) : 0;
    if (capturedHeight > 0) h = Math.max(h, capturedHeight);

    htmlEl.style.height = savedH[0];
    bodyEl.style.height = savedH[1];
    htmlEl.style.minHeight = savedMinH[0];
    bodyEl.style.minHeight = savedMinH[1];
    htmlEl.style.overflow = 'hidden';
    bodyEl.style.overflow = 'hidden';
    window.parent.postMessage({ type: 'iframe-height', height: h }, '*');
  }

  reportHeight();
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'measure-height') setTimeout(reportHeight, 0);
  });
})();
`;
