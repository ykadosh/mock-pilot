// Preload script injected into the webview guest page.
// Runs before any page scripts, so our listeners are registered first.
// Prevents the page from detecting that the window lost focus,
// which would otherwise close menus/dropdowns when the user clicks
// outside the webview (e.g. on the Capture State button).

const blockEvent = (e: Event) => {
  e.stopImmediatePropagation();
};

// Capture-phase listeners run first and block propagation
window.addEventListener("blur", blockEvent, true);
window.addEventListener("focusout", blockEvent, true);
window.addEventListener("visibilitychange", blockEvent, true);

// Override property-based handlers so pages can't set them
Object.defineProperty(window, "onblur", {
  get: () => null,
  set: () => {},
  configurable: true,
});

Object.defineProperty(document, "onvisibilitychange", {
  get: () => null,
  set: () => {},
  configurable: true,
});

// Always report as visible/focused
Object.defineProperty(document, "hidden", {
  get: () => false,
  configurable: true,
});

Object.defineProperty(document, "visibilityState", {
  get: () => "visible" as DocumentVisibilityState,
  configurable: true,
});

document.hasFocus = () => true;
