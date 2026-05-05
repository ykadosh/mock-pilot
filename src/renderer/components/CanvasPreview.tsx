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
        cssPath: getUniquePath(el)
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
      const { cssPath, html } = e.data;
      try {
        const el = document.querySelector(cssPath);
        if (el) {
          el.outerHTML = html;
          window.parent.postMessage({ type: 'modification-applied', success: true }, '*');
        } else {
          window.parent.postMessage({ type: 'modification-applied', success: false, error: 'Element not found' }, '*');
        }
      } catch (err) {
        window.parent.postMessage({ type: 'modification-applied', success: false, error: err.message }, '*');
      }
    }
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
})();
`;

export interface CanvasPreviewHandle {
  applyModification: (cssPath: string, newHTML: string) => void;
}

interface CanvasPreviewProps {
  pickerActive?: boolean;
  onElementSelected?: (element: SelectedElement) => void;
  zoom?: number;
  viewportWidth?: number;
}

export const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview({ pickerActive, onElementSelected, zoom = 100, viewportWidth = 1280 }, ref) {
  const [html, setHtml] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(800);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useImperativeHandle(ref, () => ({
    applyModification(cssPath: string, newHTML: string) {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage({ type: "apply-modification", cssPath, html: newHTML }, "*");
    },
  }));

  useEffect(() => {
    setHtml(getCapturedHtml());
  }, []);

  // Inject picker script and auto-resize logic into iframe once loaded
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const doc = iframe.contentWindow.document;

    // Report content height to parent
    const updateDimensions = () => {
      doc.documentElement.style.overflow = "visible";
      doc.body.style.overflow = "visible";
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
    // Allow brief reflow then measure
    requestAnimationFrame(() => {
      doc.documentElement.style.overflow = "visible";
      doc.body.style.overflow = "visible";
      const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.overflow = "hidden";
      setIframeHeight(h);
    });
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
