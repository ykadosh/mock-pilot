import { useEffect, useRef, useState } from "react";
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
        computedStyle: style
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
    }
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
})();
`;

interface CanvasPreviewProps {
  pickerActive?: boolean;
  onElementSelected?: (element: SelectedElement) => void;
}

export function CanvasPreview({ pickerActive, onElementSelected }: CanvasPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setHtml(getCapturedHtml());
  }, []);

  // Inject picker script into iframe once loaded
  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const doc = iframe.contentWindow.document;
    const script = doc.createElement("script");
    script.textContent = PICKER_SCRIPT;
    doc.body.appendChild(script);
  };

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

  return (
    <div className="flex-1 p-xl overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex justify-center">
      <div className="w-full max-w-5xl bg-white shadow-2xl self-start overflow-hidden rounded-lg relative">
        {html ? (
          <>
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="w-full h-[800px] border-none"
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
}
