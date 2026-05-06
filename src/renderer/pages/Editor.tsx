import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import { CanvasPreview, CanvasPreviewHandle } from "../components/CanvasPreview";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { useHistory } from "../hooks/useHistory";
import { getCapturedHtml } from "../lib/store";

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  computedStyle: Record<string, string>;
  outerHTML: string;
  cssPath: string;
  mpId: string;
}

type DevicePreset = "desktop" | "tablet" | "phone";

const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

export function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const [pickerActive, setPickerActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [zoom, setZoom] = useState(100);
  const [device, setDevice] = useState<DevicePreset>("desktop");
  const [historyOpen, setHistoryOpen] = useState(false);
  const canvasRef = useRef<CanvasPreviewHandle>(null);
  const history = useHistory(projectId);

  // Initialize history with the project HTML on load (only if no persisted history)
  useEffect(() => {
    if (!history.loaded) return;
    if (history.entries.length === 0) {
      const html = getCapturedHtml();
      if (html) {
        history.initialize(html);
      }
    }
  }, [history.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToolClick = (tool: string) => {
    if (tool === "Element Picker") {
      setPickerActive((prev) => !prev);
    } else if (tool === "History") {
      setHistoryOpen((prev) => !prev);
    }
  };

  const handleElementSelected = (element: SelectedElement) => {
    setSelectedElement(element);
    setPickerActive(false);
  };

  const handleApplyModification = useCallback((mpId: string, newHTML: string, label?: string) => {
    canvasRef.current?.applyModification(mpId, newHTML, label);
  }, []);

  // Listen for successful modifications to push to history and persist
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "modification-applied" && e.data.success && e.data.fullHTML) {
        const fullDoc = "<!DOCTYPE html><html>" + e.data.fullHTML + "</html>";
        history.push(fullDoc, e.data.label || "AI modification");
        // Persist to disk
        if (projectId) {
          window.api.updateProjectHtml(projectId, fullDoc);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [history.push, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist current state when navigating history (undo/redo/goTo)
  useEffect(() => {
    if (projectId && history.currentHtml && history.pointer > 0) {
      window.api.updateProjectHtml(projectId, history.currentHtml);
    }
  }, [history.pointer]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));

  const { width: deviceWidth, height: deviceHeight } = DEVICE_SIZES[device];

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <SideNav
          activeTab="editor"
          activeTool={pickerActive ? "Element Picker" : historyOpen ? "History" : undefined}
          onToolClick={handleToolClick}
          projectId={projectId}
        />
        <main className="flex-1 min-w-0 bg-[#020617] flex flex-col h-full relative">
          {/* Toolbar */}
          <div className="h-10 border-b border-[#334155] flex items-center justify-between px-md bg-surface-container relative z-10">
            {/* Device buttons lip — absolutely positioned */}
            <div className="absolute top-0 bottom-[-5px] left-md flex items-center bg-[#020617] rounded-b-lg px-1 border border-t-0 border-[#334155]">
              <button
                onClick={() => setDevice("desktop")}
                className={`p-1.5 px-2.5 flex items-center justify-center cursor-pointer rounded ${device === "desktop" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
              >
                <span className="material-symbols-outlined text-lg leading-none">desktop_windows</span>
              </button>
              <button
                onClick={() => setDevice("tablet")}
                className={`p-1.5 px-2.5 flex items-center justify-center cursor-pointer rounded ${device === "tablet" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
              >
                <span className="material-symbols-outlined text-lg leading-none">tablet_mac</span>
              </button>
              <button
                onClick={() => setDevice("phone")}
                className={`p-1.5 px-2.5 flex items-center justify-center cursor-pointer rounded ${device === "phone" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
              >
                <span className="material-symbols-outlined text-lg leading-none">smartphone</span>
              </button>
            </div>
            <span className="text-ui-small font-body-main text-slate-400 mx-auto">
              {deviceWidth} x {deviceHeight} ({zoom}%)
            </span>
            <div className="flex items-center gap-sm">
              <button onClick={zoomIn} className="material-symbols-outlined text-slate-500 hover:text-white cursor-pointer">
                zoom_in
              </button>
              <button onClick={zoomOut} className="material-symbols-outlined text-slate-500 hover:text-white cursor-pointer">
                zoom_out
              </button>
              <div className="w-px h-4 bg-slate-700 mx-2" />
              <button
                onClick={history.undo}
                disabled={!history.canUndo}
                className={`material-symbols-outlined cursor-pointer ${history.canUndo ? "text-slate-500 hover:text-white" : "text-slate-700 cursor-not-allowed"}`}
              >
                undo
              </button>
              <button
                onClick={history.redo}
                disabled={!history.canRedo}
                className={`material-symbols-outlined cursor-pointer ${history.canRedo ? "text-slate-500 hover:text-white" : "text-slate-700 cursor-not-allowed"}`}
              >
                redo
              </button>
            </div>
          </div>

          {/* Canvas */}
          <CanvasPreview
            ref={canvasRef}
            pickerActive={pickerActive}
            onElementSelected={handleElementSelected}
            zoom={zoom}
            viewportWidth={deviceWidth}
            projectId={projectId}
            htmlContent={history.currentHtml}
          />

          {/* History Panel */}
          {historyOpen && (
            <HistoryPanel
              entries={history.entries}
              pointer={history.pointer}
              onGoTo={history.goTo}
              onClose={() => setHistoryOpen(false)}
            />
          )}

          {/* Properties Panel */}
          {selectedElement && (
            <PropertiesPanel
              element={selectedElement}
              onClose={() => setSelectedElement(null)}
              onApplyModification={handleApplyModification}
              getElementHTML={() => canvasRef.current?.getElementHTML(selectedElement.mpId) ?? Promise.resolve(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
