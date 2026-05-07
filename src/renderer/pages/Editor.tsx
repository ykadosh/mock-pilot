import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import { CanvasPreview, CanvasPreviewHandle } from "../components/CanvasPreview";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import { CodeEditor, CodeEditorHandle } from "../components/CodeEditor";
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
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [projectName, setProjectName] = useState("");
  const canvasRef = useRef<CanvasPreviewHandle>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const pendingLabelRef = useRef<string>("AI modification");
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

  useEffect(() => {
    if (!projectId) return;
    window.api.listProjects().then((projects: { id: string; title: string }[]) => {
      const project = projects.find((p) => p.id === projectId);
      if (project) setProjectName(project.title);
    });
  }, [projectId]);

  const handleToolClick = (tool: string) => {
    if (tool === "Element Picker") {
      setPickerActive((prev) => !prev);
      setHistoryOpen(false);
      setCodeEditorOpen(false);
    } else if (tool === "History") {
      setHistoryOpen((prev) => !prev);
      setPickerActive(false);
      setSelectedElement(null);
      setCodeEditorOpen(false);
    } else if (tool === "Code Editor") {
      setCodeEditorOpen((prev) => !prev);
      setPickerActive(false);
      setSelectedElement(null);
      setHistoryOpen(false);
    }
  };

  const handleElementSelected = (element: SelectedElement) => {
    setSelectedElement(element);
    setPickerActive(false);
    setHistoryOpen(false);
  };

  const handleApplyModification = useCallback((mpId: string, newHTML: string, label?: string) => {
    pendingLabelRef.current = label || "AI modification";
    canvasRef.current?.applyModification(mpId, newHTML, label);
    // Close properties panel if element is being removed
    if (newHTML === "__REMOVE_ELEMENT__") {
      setSelectedElement(null);
    }
  }, []);

  // Listen for successful modifications to push to history and persist
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "modification-applied" && e.data.success && e.data.fullHTML) {
        const fullDoc = "<!DOCTYPE html><html>" + e.data.fullHTML + "</html>";
        const label = pendingLabelRef.current || e.data.label || "AI modification";
        history.push(fullDoc, label);
        pendingLabelRef.current = "AI modification";
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

  const handleCodeUpdate = useCallback((fullHtml: string, label: string) => {
    history.push(fullHtml, label);
    if (projectId) {
      window.api.updateProjectHtml(projectId, fullHtml);
    }
    setCodeEditorOpen(false);
  }, [history.push, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const { width: deviceWidth, height: deviceHeight } = DEVICE_SIZES[device];

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <SideNav
          activeTab="editor"
          activeTool={pickerActive ? "Element Picker" : historyOpen ? "History" : codeEditorOpen ? "Code Editor" : undefined}
          onToolClick={handleToolClick}
          projectId={projectId}
          projectName={projectName}
          revisionCount={history.entries.length}
        />
        <main className="flex-1 min-w-0 bg-[#020617] flex flex-col h-full relative">
          {/* Toolbar */}
          <div className="h-10 border-b border-[#334155] flex items-center justify-between px-md bg-surface-container relative z-10">
            {codeEditorOpen ? (
              <>
                {/* Code editor tabs */}
                <div className="flex items-center self-stretch">
                  <button
                    onClick={() => setCodeTab("html")}
                    className={`px-3 text-xs font-mono cursor-pointer transition-colors self-stretch flex items-center border-b-2 ${
                      codeTab === "html"
                        ? "text-violet-400 border-violet-400 bg-slate-800"
                        : "text-slate-500 hover:text-slate-300 border-transparent"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setCodeTab("css")}
                    className={`px-3 text-xs font-mono cursor-pointer transition-colors self-stretch flex items-center border-b-2 ml-1 ${
                      codeTab === "css"
                        ? "text-violet-400 border-violet-400 bg-slate-800"
                        : "text-slate-500 hover:text-slate-300 border-transparent"
                    }`}
                  >
                    CSS
                  </button>
                </div>
                <button
                  onClick={() => codeEditorRef.current?.update()}
                  className="px-3 py-1 text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white rounded cursor-pointer transition-colors"
                >
                  Update
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Canvas or Code Editor */}
          {codeEditorOpen && history.currentHtml ? (
            <CodeEditor
              ref={codeEditorRef}
              htmlContent={history.currentHtml}
              onUpdate={handleCodeUpdate}
              activeTab={codeTab}
            />
          ) : (
            <CanvasPreview
              ref={canvasRef}
              pickerActive={pickerActive}
              selectedMpId={selectedElement?.mpId || null}
              onElementSelected={handleElementSelected}
              zoom={zoom}
              viewportWidth={deviceWidth}
              projectId={projectId}
              htmlContent={history.currentHtml}
            />
          )}

          {/* Side Panel — only one at a time, history takes priority */}
          {historyOpen ? (
            <HistoryPanel
              entries={history.entries}
              pointer={history.pointer}
              onGoTo={history.goTo}
              onClose={() => setHistoryOpen(false)}
            />
          ) : selectedElement ? (
            <PropertiesPanel
              element={selectedElement}
              onClose={() => setSelectedElement(null)}
              onApplyModification={handleApplyModification}
              getElementHTML={() => canvasRef.current?.getElementHTML(selectedElement.mpId) ?? Promise.resolve(null)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
