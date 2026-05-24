export const PICKER_SCRIPT = `
(function() {
  if (window.__pickerInitialized) return;
  window.__pickerInitialized = true;

  let overlay = null;
  let label = null;
  let active = false;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.setAttribute('data-mp-injected', 'true');
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #7c3aed;background:rgba(124,58,237,0.08);border-radius:6px;z-index:99999;display:none;transition:all 0.05s ease-out;';
    label = document.createElement('div');
    label.setAttribute('data-mp-injected', 'true');
    label.style.cssText = 'position:fixed;pointer-events:none;background:#7c3aed;color:white;font-size:11px;font-family:monospace;padding:2px 6px;border-radius:2px;z-index:100000;display:none;white-space:nowrap;';
    document.body.appendChild(overlay);
    document.body.appendChild(label);
  }

  function getSelector(el) {
    let name = el.tagName.toLowerCase();
    if (el.id) name += '#' + el.id;
    else if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
      if (classes) name += '.' + classes;
    }
    return name;
  }

  function updateOverlay(el, showLabel) {
    if (!overlay) createOverlay();
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    label.style.display = showLabel ? 'block' : 'none';
    label.style.top = Math.max(0, rect.top - 22) + 'px';
    label.style.left = rect.left + 'px';
    label.textContent = getSelector(el);
    return rect;
  }

  function getUniquePath(el) {
    const path = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) { path.unshift('#' + el.id); break; }
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
        if (siblings.length > 1) selector += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
      }
      path.unshift(selector);
      el = parent;
    }
    return 'body > ' + path.join(' > ');
  }

  function getStyleMap(el) {
    const computed = window.getComputedStyle(el);
    const style = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) continue;
      style[prop] = computed.getPropertyValue(prop);
    }
    return style;
  }

  function getCleanHTML() {
    var injected = document.querySelectorAll('[data-mp-injected]');
    var saved = [];
    for (var i = 0; i < injected.length; i++) {
      saved.push({ el: injected[i], parent: injected[i].parentNode, next: injected[i].nextSibling });
      injected[i].parentNode.removeChild(injected[i]);
    }
    var html = document.documentElement.outerHTML;
    for (var j = 0; j < saved.length; j++) {
      var s = saved[j];
      if (s.next && s.next.parentNode === s.parent) s.parent.insertBefore(s.el, s.next);
      else if (s.parent) s.parent.appendChild(s.el);
    }
    return html;
  }

  function postSelected(el, mpId, rect) {
    window.parent.postMessage({
      type: 'element-selected',
      data: {
        tagName: el.tagName.toLowerCase(), id: el.id || '', className: typeof el.className === 'string' ? el.className : '',
        computedStyle: getStyleMap(el), outerHTML: el.outerHTML, cssPath: getUniquePath(el), mpId: mpId,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
    }, '*');
  }

  function handleMouseMove(e) {
    if (!active || e.target === overlay || e.target === label) return;
    updateOverlay(e.target, true);
  }

  function handleClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    active = false;
    document.body.style.cursor = '';
    const el = e.target;
    const mpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    el.setAttribute('data-mp-id', mpId);
    postSelected(el, mpId, updateOverlay(el, true));
  }

  function handlePickerAction(type, cb) {
    const mpId = type.mpId;
    const el = document.querySelector('[data-mp-id="' + mpId + '"]');
    if (!el) return;
    cb(el, mpId);
  }

  function findRectSelection(selRect) {
    var allEls = document.body.querySelectorAll('*');
    var bestEl = null;
    var bestArea = 0;
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (el.getAttribute('data-mp-injected')) continue;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.tagName === 'META') continue;
      var r = el.getBoundingClientRect();
      if ((r.width === 0 && r.height === 0) || r.left < selRect.left || r.top < selRect.top) continue;
      if (r.left + r.width > selRect.left + selRect.width || r.top + r.height > selRect.top + selRect.height) continue;
      var area = r.width * r.height;
      if (area > bestArea) { bestArea = area; bestEl = el; }
    }
    return bestEl;
  }

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'picker-activate') { if (!overlay) createOverlay(); active = true; document.body.style.cursor = 'crosshair'; return; }
    if (e.data.type === 'picker-deactivate') { active = false; if (overlay) overlay.style.display = 'none'; if (label) label.style.display = 'none'; document.body.style.cursor = ''; return; }
    if (e.data.type === 'picker-highlight') { active = false; document.body.style.cursor = ''; handlePickerAction(e.data, function(el) { updateOverlay(el, false); }); return; }
    if (e.data.type === 'picker-action-duplicate') { handlePickerAction(e.data, function(el) { const clone = el.cloneNode(true); clone.setAttribute('data-mp-id', 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)); el.parentNode.insertBefore(clone, el.nextSibling); window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Duplicate element' }, '*'); }); return; }
    if (e.data.type === 'picker-action-delete') { handlePickerAction(e.data, function(el) { el.remove(); if (overlay) overlay.style.display = 'none'; if (label) label.style.display = 'none'; window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Delete element' }, '*'); }); return; }
    if (e.data.type === 'picker-action-move-up') { handlePickerAction(e.data, function(el) { if (!el.previousElementSibling) return; const rect = updateOverlay((el.parentNode.insertBefore(el, el.previousElementSibling), el), true); window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Move element up' }, '*'); window.parent.postMessage({ type: 'element-rect-update', rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*'); }); return; }
    if (e.data.type === 'picker-action-move-down') { handlePickerAction(e.data, function(el) { if (!el.nextElementSibling) return; el.parentNode.insertBefore(el.nextElementSibling, el); const rect = updateOverlay(el, true); window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Move element down' }, '*'); window.parent.postMessage({ type: 'element-rect-update', rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*'); }); return; }
    if (e.data.type === 'picker-action-select-parent') { handlePickerAction(e.data, function(el) { var parent = el.parentElement; if (!parent || parent === document.body || parent === document.documentElement) return; var parentMpId = parent.getAttribute('data-mp-id'); if (!parentMpId) { parentMpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); parent.setAttribute('data-mp-id', parentMpId); } postSelected(parent, parentMpId, updateOverlay(parent, true)); }); return; }
    if (e.data.type === 'apply-modification') { try { handlePickerAction(e.data, function(el, mpId) { if (e.data.html === '__REMOVE_ELEMENT__') el.remove(); else { const temp = document.createElement('div'); temp.innerHTML = e.data.html; const newEl = temp.firstElementChild; if (newEl) { newEl.setAttribute('data-mp-id', mpId); el.outerHTML = newEl.outerHTML; } else { el.outerHTML = e.data.html; } } window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: e.data.label || 'AI modification' }, '*'); }); } catch (err) { window.parent.postMessage({ type: 'modification-applied', success: false, error: err.message }, '*'); } return; }
    if (e.data.type === 'get-element-html') { handlePickerAction(e.data, function(el, mpId) { window.parent.postMessage({ type: 'element-html-response', mpId: mpId, outerHTML: el.outerHTML, computedStyle: getStyleMap(el) }, '*'); }); if (!document.querySelector('[data-mp-id="' + e.data.mpId + '"]')) window.parent.postMessage({ type: 'element-html-response', mpId: e.data.mpId, outerHTML: null }, '*'); return; }
    if (e.data.type !== 'rect-select') return;
    var bestEl = findRectSelection(e.data.rect);
    if (!bestEl) return;
    var mpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    bestEl.setAttribute('data-mp-id', mpId);
    postSelected(bestEl, mpId, updateOverlay(bestEl, true));
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
})();
`;
