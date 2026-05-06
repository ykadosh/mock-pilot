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
    overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #7c3aed;background:rgba(124,58,237,0.08);z-index:99999;display:none;transition:all 0.05s ease-out;';
    label = document.createElement('div');
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

  function handleClick(e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    // Assign a unique ID for reliable element tracking across DOM mutations
    const mpId = 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    el.setAttribute('data-mp-id', mpId);
    const computed = window.getComputedStyle(el);
    const style = {};
    ['width','height','padding','margin','background-color','color','font-size','font-family','border-radius','display','position'].forEach(prop => {
      style[prop] = computed.getPropertyValue(prop);
    });
    window.parent.postMessage({
      type: 'element-selected',
      data: {
        tagName: el.tagName.toLowerCase(),
        id: el.id || '',
        className: (typeof el.className === 'string' ? el.className : ''),
        computedStyle: style,
        outerHTML: el.outerHTML,
        cssPath: getUniquePath(el),
        mpId: mpId
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
          window.parent.postMessage({ type: 'modification-applied', success: true, fullHTML: document.documentElement.outerHTML, label: modLabel || 'AI modification' }, '*');
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
        ['width','height','padding','margin','background-color','color','font-size','font-family','border-radius','display','position'].forEach(prop => {
          style[prop] = computed.getPropertyValue(prop);
        });
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
  onElementSelected?: (element: SelectedElement) => void;
  zoom?: number;
  viewportWidth?: number;
  projectId?: string;
  htmlContent?: string | null;
}

export const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview({ pickerActive, onElementSelected, zoom = 100, viewportWidth = 1280, projectId, htmlContent }, ref) {
  const [html, setHtml] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(800);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Use htmlContent prop if provided, otherwise fall back to store
  useEffect(() => {
    if (htmlContent !== undefined) {
      setHtml(htmlContent);
    } else {
      setHtml(getCapturedHtml());
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

    // Report content height to parent
    const updateDimensions = () => {
      doc.documentElement.style.height = "auto";
      doc.body.style.height = "auto";
      doc.documentElement.style.overflow = "visible";
      doc.body.style.overflow = "visible";
      void doc.body.offsetHeight;
      const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
      setIframeHeight(h);
    };

    // Disable iframe scrolling — canvas handles it
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
    updateDimensions();

    // Observe resize changes
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(doc.body);

    // Inject picker script
    const script = doc.createElement("script");
    script.textContent = PICKER_SCRIPT;
    doc.body.appendChild(script);
  };

  // Re-measure height when viewport width changes (content reflows)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const doc = iframe.contentWindow.document;

    const measure = () => {
      // Reset any fixed height on body/html so content can shrink
      doc.documentElement.style.height = "auto";
      doc.body.style.height = "auto";
      doc.documentElement.style.overflow = "visible";
      doc.body.style.overflow = "visible";
      doc.documentElement.style.width = viewportWidth + "px";
      doc.body.style.width = viewportWidth + "px";

      // Force layout recalculation
      void doc.body.offsetHeight;

      const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
      setIframeHeight(h);
    };

    // Measure multiple times to catch async layout
    const t1 = setTimeout(measure, 0);
    const t2 = setTimeout(measure, 100);
    const t3 = setTimeout(measure, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [viewportWidth]);

  // Activate/deactivate picker in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: pickerActive ? "picker-activate" : "picker-deactivate" },
      "*"
    );
  }, [pickerActive]);

  // Listen for element selection from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "element-selected" && onElementSelected) {
        onElementSelected(e.data.data);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onElementSelected]);

  const scale = zoom / 100;

  return (
    <div className="flex-1 p-xl overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
      <div
        className="bg-white shadow-2xl overflow-hidden rounded-lg relative mx-auto"
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
  );
});
