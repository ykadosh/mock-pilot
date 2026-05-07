// Preload script injected into the webview guest page.
// Runs before any page scripts, so our listeners are registered first.
// Prevents the page from detecting that the window lost focus,
// which would otherwise close menus/dropdowns when the user clicks
// outside the webview (e.g. on the Capture State button).

// Because contextIsolation is on (default), this preload runs in an
// isolated world — NOT the page's JS context.  We must use
// webFrame.executeJavaScript() to inject into the main world (world 0)
// where the page's scripts and event listeners live.

const { webFrame } = require("electron");

webFrame.executeJavaScript(`
  (function() {
    var block = function(e) { e.stopImmediatePropagation(); };

    window.addEventListener('blur', block, true);
    window.addEventListener('focusout', block, true);
    window.addEventListener('visibilitychange', block, true);

    Object.defineProperty(window, 'onblur', {
      get: function() { return null; },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(document, 'onvisibilitychange', {
      get: function() { return null; },
      set: function() {},
      configurable: true
    });
    Object.defineProperty(document, 'hidden', {
      get: function() { return false; },
      configurable: true
    });
    Object.defineProperty(document, 'visibilityState', {
      get: function() { return 'visible'; },
      configurable: true
    });
    document.hasFocus = function() { return true; };
  })();
`);
