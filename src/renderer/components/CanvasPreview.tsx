import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { getCapturedHtml } from "../lib/store";
import type { SelectedElement } from "../pages/Editor";

// Script injected into the iframe to handle element picking
const PICKER_SCRIPT = `
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

  function handleMouseMove(e) {
    if (!active) return;
    const el = e.target;
    if (el === overlay || el === label) return;
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    label.style.display = 'block';
    label.style.top = Math.max(0, rect.top - 22) + 'px';
    label.style.left = rect.left + 'px';
    label.textContent = getSelector(el);
  }

  function getUniquePath(el) {
    const path = [];
    while (el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      if (el.id) { path.unshift('#' + el.id); break; }
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
        if (siblings.length > 1) selector += ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')';
      }
      path.unshift(selector);
      el = parent;
    }
    return 'body > ' + path.join(' > ');
  }

  function getCleanHTML() {
    var injected = document.querySelectorAll('[data-mp-injected]');
    var saved = [];
    for (var i = 0; i < injected.length; i++) {
      saved.push({ el: injected[i], parent: injected[i].parentNode, next: injected[i].nextSibling });
      injected[i].parentNode.removeChild(injected[i]);
    }
    var html = document.documentElement.outerHTML;
    for (var i = 0; i < saved.length; i++) {
      var s = saved[i];
      if (s.next && s.next.parentNode === s.parent) s.parent.insertBefore(s.el, s.next);
      else if (s.parent) s.parent.appendChild(s.el);
    }
    return html;
  }

  function handleClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    active = false;
    document.body.style.cursor = '';
    const el = e.target;
    // Assign a unique ID for reliable element tracking across DOM mutations
    const mpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    el.setAttribute('data-mp-id', mpId);
    // Keep overlay visible on the clicked element
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    label.style.display = 'block';
    label.style.top = Math.max(0, rect.top - 22) + 'px';
    label.style.left = rect.left + 'px';
    label.textContent = getSelector(el);
    const computed = window.getComputedStyle(el);
    const style = {};
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) continue;
      style[prop] = computed.getPropertyValue(prop);
    }
    window.parent.postMessage({
      type: 'element-selected',
      data: {
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: (typeof el.className === 'string' ? el.className : ''),
        computedStyle: style,
        outerHTML: el.outerHTML,
        cssPath: getUniquePath(el),
        mpId: mpId,
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      }
    }, '*');
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'picker-activate') {
      if (!overlay) createOverlay();
      active = true;
      document.body.style.cursor = 'crosshair';
    } else if (e.data && e.data.type === 'picker-deactivate') {
      active = false;
      if (overlay) overlay.style.display = 'none';
      if (label) label.style.display = 'none';
      document.body.style.cursor = '';
    } else if (e.data && e.data.type === 'picker-highlight') {
      // Show overlay on a specific element without activating mousemove tracking
      active = false;
      document.body.style.cursor = '';
      if (!overlay) createOverlay();
      const mpId = e.data.mpId;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el) {
        const rect = el.getBoundingClientRect();
        overlay.style.display = 'block';
        overlay.style.top = rect.top + 'px';
        overlay.style.left = rect.left + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
        // Hide in-iframe label — external toolbar shows selector info
        label.style.display = 'none';
      }
    } else if (e.data && e.data.type === 'picker-action-duplicate') {
      const mpId = e.data.mpId;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el) {
        const clone = el.cloneNode(true);
        const newMpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        clone.setAttribute('data-mp-id', newMpId);
        el.parentNode.insertBefore(clone, el.nextSibling);
        window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Duplicate element' }, '*');
      }
    } else if (e.data && e.data.type === 'picker-action-delete') {
      const mpId = e.data.mpId;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el) {
        el.remove();
        if (overlay) overlay.style.display = 'none';
        if (label) label.style.display = 'none';
        window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Delete element' }, '*');
      }
    } else if (e.data && e.data.type === 'picker-action-move-up') {
      const mpId = e.data.mpId;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el && el.previousElementSibling) {
        el.parentNode.insertBefore(el, el.previousElementSibling);
        const rect = el.getBoundingClientRect();
        if (overlay) { overlay.style.top = rect.top + 'px'; overlay.style.left = rect.left + 'px'; overlay.style.width = rect.width + 'px'; overlay.style.height = rect.height + 'px'; }
        window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Move element up' }, '*');
        window.parent.postMessage({ type: 'element-rect-update', rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*');
      }
    } else if (e.data && e.data.type === 'picker-action-move-down') {
      const mpId = e.data.mpId;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el && el.nextElementSibling) {
        el.parentNode.insertBefore(el.nextElementSibling, el);
        const rect = el.getBoundingClientRect();
        if (overlay) { overlay.style.top = rect.top + 'px'; overlay.style.left = rect.left + 'px'; overlay.style.width = rect.width + 'px'; overlay.style.height = rect.height + 'px'; }
        window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: 'Move element down' }, '*');
        window.parent.postMessage({ type: 'element-rect-update', rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } }, '*');
      }
    } else if (e.data && e.data.type === 'apply-modification') {
      const mpId = e.data.mpId;
      const modHtml = e.data.html;
      const modLabel = e.data.label;
      try {
        const el = document.querySelector('[data-mp-id="' + mpId + '"]');
        if (el) {
          if (modHtml === '__REMOVE_ELEMENT__') {
            el.remove();
          } else {
            // Parse the new HTML and ensure the data-mp-id is preserved
            const temp = document.createElement('div');
            temp.innerHTML = modHtml;
            const newEl = temp.firstElementChild;
            if (newEl) {
              newEl.setAttribute('data-mp-id', mpId);
              el.outerHTML = newEl.outerHTML;
            } else {
              el.outerHTML = modHtml;
            }
          }
          window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: getCleanHTML(), label: modLabel || 'AI modification' }, '*');
        } else {
          window.parent.postMessage({ type: 'modification-applied', success: false, error: 'Element not found by data-mp-id' }, '*');
        }
      } catch (err) {
        window.parent.postMessage({ type: 'modification-applied', success: false, error: err.message }, '*');
      }
    } else if (e.data && e.data.type === 'get-element-html') {
      const { mpId } = e.data;
      const el = document.querySelector('[data-mp-id="' + mpId + '"]');
      if (el) {
        const computed = window.getComputedStyle(el);
        const style = {};
        for (let i = 0; i < computed.length; i++) {
          const prop = computed[i];
          if (prop.startsWith('-webkit-') || prop.startsWith('-moz-') || prop.startsWith('-ms-')) continue;
          style[prop] = computed.getPropertyValue(prop);
        }
        window.parent.postMessage({ type: 'element-html-response', mpId: mpId, outerHTML: el.outerHTML, computedStyle: style }, '*');
      } else {
        window.parent.postMessage({ type: 'element-html-response', mpId: mpId, outerHTML: null }, '*');
      }
    }
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
})();
`;

export interface CanvasPreviewHandle {
  applyModification: (mpId: string, newHTML: string, label?: string) => void;
  getElementHTML: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
}

interface CanvasPreviewProps {
  pickerActive?: boolean;
  selectedMpId?: string | null;
  selectedSelector?: string;
  onElementSelected?: (element: SelectedElement) => void;
  onElementDeselected?: () => void;
  zoom?: number;
  viewportWidth?: number;
  projectId?: string;
  htmlContent?: string | null;
}

// Strip picker artifacts (overlays, labels, scripts) from HTML that may have been
// persisted from a previous session to prevent stale highlights on reload.
function cleanHtml(html: string | null): string | null {
  if (!html) return html;
  // Remove elements with data-mp-injected attribute (picker overlays)
  html = html.replace(/<[^>]+data-mp-injected[^>]*>[\s\S]*?<\/[^>]+>/g, '');
  // Remove fixed overlay divs with z-index 99999 or 100000 (picker highlight divs)
  html = html.replace(/<div[^>]*style="[^"]*z-index:\s*(?:99999|100000)\b[^"]*position:\s*fixed[^"]*pointer-events:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
  html = html.replace(/<div[^>]*style="[^"]*position:\s*fixed[^"]*z-index:\s*(?:99999|100000)\b[^"]*pointer-events:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/g, '');
  // Remove injected scripts (picker initialization, height reporting)
  html = html.replace(/<script[^>]*>[\s\S]*?(?:__pickerInitialized|reportHeight)[\s\S]*?<\/script>/g, '');
  return html;
}

export const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview({ pickerActive, selectedMpId, selectedSelector, onElementSelected, onElementDeselected, zoom = 100, viewportWidth = 1280, projectId, htmlContent }, ref) {
  const [html, setHtml] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(800);
  const [selectedRect, setSelectedRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoadId, setIframeLoadId] = useState(0);

  // Use htmlContent prop if provided, otherwise fall back to store.
  // cleanHtml only on first load to strip artifacts from previously persisted HTML.
  const initialCleanDone = useRef(false);
  useEffect(() => {
    if (htmlContent !== undefined) {
      if (!initialCleanDone.current) {
        initialCleanDone.current = true;
        setHtml(cleanHtml(htmlContent));
      } else {
        setHtml(htmlContent);
      }
    } else {
      setHtml(cleanHtml(getCapturedHtml()));
    }
  }, [htmlContent]);

  useImperativeHandle(ref, () => ({
    applyModification(mpId: string, newHTML: string, label?: string) {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage({ type: "apply-modification", mpId, html: newHTML, label: label || "AI modification" }, "*");
    },
    getElementHTML(mpId: string): Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null> {
      return new Promise((resolve) => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) { resolve(null); return; }
        const handler = (e: MessageEvent) => {
          if (e.data?.type === "element-html-response" && e.data.mpId === mpId) {
            window.removeEventListener("message", handler);
            if (e.data.outerHTML) {
              resolve({ outerHTML: e.data.outerHTML, computedStyle: e.data.computedStyle });
            } else {
              resolve(null);
            }
          }
        };
        window.addEventListener("message", handler);
        iframe.contentWindow.postMessage({ type: "get-element-html", mpId }, "*");
        // Timeout fallback
        setTimeout(() => { window.removeEventListener("message", handler); resolve(null); }, 2000);
      });
    },
  }));

  // Inject picker script and auto-resize logic into iframe once loaded
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const doc = iframe.contentWindow.document;

    // Disable iframe scrolling — canvas handles it
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";

    // Inject a resize reporter that measures from inside the iframe
    const resizeScript = doc.createElement("script");
    resizeScript.setAttribute('data-mp-injected', 'true');
    resizeScript.textContent = `
      (function() {
        function reportHeight() {
          // Break circular height chains (e.g. height:100%, min-height:100vh)
          // by temporarily forcing auto height on html/body before measuring
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

          // Also measure absolutely positioned children that don't contribute to scrollHeight
          var children = bodyEl.children;
          for (var i = 0; i < children.length; i++) {
            var cs = getComputedStyle(children[i]);
            if (cs.position === 'absolute' || cs.position === 'fixed') {
              var rect = children[i].getBoundingClientRect();
              h = Math.max(h, rect.bottom);
            }
          }
          // Use captured viewport height as minimum (NOT window.innerHeight which
          // equals the iframe height and creates a feedback loop)
          var vpMeta = document.querySelector('meta[name="mp-viewport-height"]');
          var capturedHeight = vpMeta ? parseInt(vpMeta.content, 10) : 0;
          if (capturedHeight > 0) h = Math.max(h, capturedHeight);

          // Restore styles
          htmlEl.style.height = savedH[0];
          bodyEl.style.height = savedH[1];
          htmlEl.style.minHeight = savedMinH[0];
          bodyEl.style.minHeight = savedMinH[1];
          htmlEl.style.overflow = 'hidden';
          bodyEl.style.overflow = 'hidden';

          window.parent.postMessage({ type: 'iframe-height', height: h }, '*');
        }
        reportHeight();
        // No ResizeObserver — captured pages are static, and observing body
        // size creates a feedback loop (parent resizes iframe → observer fires
        // → re-measure → parent resizes again → ...).
        // Remeasurement is triggered on demand via the 'measure-height' message.
        window.addEventListener('message', function(e) {
          if (e.data && e.data.type === 'measure-height') {
            setTimeout(reportHeight, 0);
          }
        });
      })();
    `;
    doc.body.appendChild(resizeScript);

    // Inject picker script
    const script = doc.createElement("script");
    script.setAttribute('data-mp-injected', 'true');
    script.textContent = PICKER_SCRIPT;
    doc.body.appendChild(script);

    // Bump load id so the picker/highlight useEffect re-fires
    setIframeLoadId(prev => prev + 1);
  };

  // Listen for height reports from the iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "iframe-height" && typeof e.data.height === "number") {
        setIframeHeight(e.data.height);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Ask iframe to remeasure when viewport width changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    // Shrink iframe height via React state to force content reflow at the new
    // width.  Using state (not an imperative DOM mutation) ensures React always
    // re-applies the measured height — even when the new measurement equals the
    // previous value — because the state transition is 1 → measured, not N → N.
    setIframeHeight(1);
    const t = setTimeout(() => {
      iframe.contentWindow?.postMessage({ type: "measure-height" }, "*");
    }, 50);
    return () => clearTimeout(t);
  }, [viewportWidth]);

  // Activate/deactivate picker or highlight selected element in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (selectedMpId) {
      // Element is selected — show persistent highlight
      iframe.contentWindow.postMessage(
        { type: "picker-highlight", mpId: selectedMpId },
        "*"
      );
    } else if (pickerActive) {
      // Picker is active — enable crosshair and hover highlight
      iframe.contentWindow.postMessage(
        { type: "picker-activate" },
        "*"
      );
    } else {
      // Neither selected nor picking — deactivate everything
      iframe.contentWindow.postMessage(
        { type: "picker-deactivate" },
        "*"
      );
    }
  }, [selectedMpId, pickerActive, iframeLoadId]);

  // Listen for element selection from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "element-selected" && onElementSelected) {
        if (e.data.data.rect) {
          setSelectedRect(e.data.data.rect);
        }
        onElementSelected(e.data.data);
      } else if (e.data?.type === "element-deselected" && onElementDeselected) {
        setSelectedRect(null);
        onElementDeselected();
      } else if (e.data?.type === "element-rect-update" && e.data.rect) {
        setSelectedRect(e.data.rect);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onElementSelected, onElementDeselected]);

  // Clear rect when element is deselected externally
  useEffect(() => {
    if (!selectedMpId) setSelectedRect(null);
  }, [selectedMpId]);

  const scale = zoom / 100;

  const sendPickerAction = (action: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !selectedMpId) return;
    iframe.contentWindow.postMessage({ type: action, mpId: selectedMpId }, "*");
  };

  const handleToolbarDelete = () => {
    sendPickerAction("picker-action-delete");
    onElementDeselected?.();
  };

  return (
    <div className="flex-1 p-xl overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="relative mx-auto" style={{ width: `${viewportWidth * scale}px` }}>
        {/* Floating toolbar for selected element */}
        {selectedMpId && selectedRect && (
          <div
            className="absolute z-20 flex items-center bg-[#7c3aed] text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg whitespace-nowrap"
            style={{
              top: `${Math.max(0, selectedRect.top * scale - 28)}px`,
              left: `${selectedRect.left * scale}px`,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>ads_click</span>
            <span className="ml-1">{selectedSelector || "Element"}</span>
            <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-white/30">
              <button onClick={() => sendPickerAction("picker-action-duplicate")} className="material-symbols-outlined cursor-pointer hover:bg-white/20 rounded p-0.5 transition-colors" style={{ fontSize: '16px' }} title="Duplicate">content_copy</button>
              <button onClick={handleToolbarDelete} className="material-symbols-outlined cursor-pointer hover:bg-white/20 rounded p-0.5 transition-colors" style={{ fontSize: '16px' }} title="Delete">delete</button>
              <button onClick={() => sendPickerAction("picker-action-move-up")} className="material-symbols-outlined cursor-pointer hover:bg-white/20 rounded p-0.5 transition-colors" style={{ fontSize: '16px' }} title="Move up">arrow_upward</button>
              <button onClick={() => sendPickerAction("picker-action-move-down")} className="material-symbols-outlined cursor-pointer hover:bg-white/20 rounded p-0.5 transition-colors" style={{ fontSize: '16px' }} title="Move down">arrow_downward</button>
              <button onClick={() => onElementDeselected?.()} className="material-symbols-outlined cursor-pointer hover:bg-white/20 rounded p-0.5 transition-colors" style={{ fontSize: '16px' }} title="Deselect">close</button>
            </div>
          </div>
        )}
        {/* Canvas container */}
        <div
          className="bg-white shadow-2xl overflow-hidden rounded-lg relative"
          style={{
            width: `${viewportWidth * scale}px`,
            height: `${iframeHeight * scale}px`,
          }}
        >
          {html ? (
            <>
              <iframe
                ref={iframeRef}
                srcDoc={html}
                className="border-none origin-top-left"
                style={{
                  width: `${viewportWidth}px`,
                  height: `${iframeHeight}px`,
                  transform: `scale(${scale})`,
                }}
                sandbox="allow-same-origin allow-scripts"
                title="Website Preview"
                onLoad={handleIframeLoad}
              />
              {/* Block interaction when picker is not active */}
              {!pickerActive && (
                <div className="absolute inset-0 cursor-default" />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-md">
                web
              </span>
              <p className="text-sm">No website captured yet</p>
              <p className="text-xs text-slate-500 mt-xs">
                Create a new project to capture a website
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
