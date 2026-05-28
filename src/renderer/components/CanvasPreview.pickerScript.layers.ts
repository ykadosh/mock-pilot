export const LAYERS_HOVER_SCRIPT = `
  let hoverOverlay = null;
  let hoverLabel = null;

  function createHoverOverlay() {
    hoverOverlay = document.createElement('div');
    hoverOverlay.setAttribute('data-mp-injected', 'true');
    hoverOverlay.style.cssText = 'position:fixed;pointer-events:none;border:2px dashed #38bdf8;background:rgba(56,189,248,0.08);border-radius:6px;z-index:99998;display:none;transition:all 0.05s ease-out;';
    hoverLabel = document.createElement('div');
    hoverLabel.setAttribute('data-mp-injected', 'true');
    hoverLabel.style.cssText = 'position:fixed;pointer-events:none;background:#38bdf8;color:white;font-size:11px;font-family:monospace;padding:2px 6px;border-radius:2px;z-index:99999;display:none;white-space:nowrap;';
    document.body.appendChild(hoverOverlay);
    document.body.appendChild(hoverLabel);
  }

  function updateHoverOverlay(el, getSelector) {
    if (!hoverOverlay) createHoverOverlay();
    var rect = el.getBoundingClientRect();
    hoverOverlay.style.display = 'block';
    hoverOverlay.style.top = rect.top + 'px';
    hoverOverlay.style.left = rect.left + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
    hoverLabel.style.display = 'block';
    hoverLabel.style.top = Math.max(0, rect.top - 22) + 'px';
    hoverLabel.style.left = rect.left + 'px';
    hoverLabel.textContent = getSelector(el);
  }

  function hideHoverOverlay() {
    if (hoverOverlay) hoverOverlay.style.display = 'none';
    if (hoverLabel) hoverLabel.style.display = 'none';
  }
`;
