import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import type { CanvasPreviewHandle } from "../components/CanvasPreview";
import { CanvasPreview } from "../components/CanvasPreview";
import { PropertiesPanel } from "../components/PropertiesPanel";
import { HistoryPanel } from "../components/HistoryPanel";
import type { CodeEditorHandle } from "../components/CodeEditor";
import { CodeEditor } from "../components/CodeEditor";
import { useHistory } from "../hooks/useHistory";
import { getCapturedHtml, getAssetsBasePath } from "../lib/store";

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  computedStyle: Record<string, string>;
  outerHTML: string;
  cssPath: string;
  mpId: string;
  rect?: { top: number; left: number; width: number; height: number };
}

type DevicePreset = "desktop" | "tablet" | "phone";

const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

export function Editor({ codeEditorDefault = false }: { codeEditorDefault?: boolean }) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [pickerActive, setPickerActive] = useState(false);
  const [rectSelectorActive, setRectSelectorActive] = useState(false);
  const [panActive, setPanActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [zoom, setZoom] = useState(100);
  const [device, setDevice] = useState<DevicePreset>("desktop");
  const [historyOpen, setHistoryOpen] = useState(false);
  const codeEditorOpen = codeEditorDefault;
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [codeDirty, setCodeDirty] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [assetsBasePath, setAssetsBasePath] = useState<string | null>(getAssetsBasePath());
  const canvasRef = useRef<CanvasPreviewHandle>(null);
  const codeEditorRef = useRef<CodeEditorHandle>(null);
  const pendingLabelRef = useRef<string>("AI modification");
  const history = useHistory(projectId);

  // Ensure assetsBasePath is available (e.g. after page refresh)
  useEffect(() => {
    if (assetsBasePath || !projectId) return;
    window.api.loadProject(projectId).then((result) => {
      if (result.success && result.assetsBasePath) {
        setAssetsBasePath(result.assetsBasePath);
      }
    });
  }, [projectId, assetsBasePath]);

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
      setRectSelectorActive(false);
      setPanActive(false);
      setSelectedElement(null);
      setHistoryOpen(false);
    } else if (tool === "Rectangle Selector") {
      setRectSelectorActive((prev) => !prev);
      setPickerActive(false);
      setPanActive(false);
      setSelectedElement(null);
      setHistoryOpen(false);
    } else if (tool === "Pan Tool") {
      setPanActive((prev) => !prev);
      setPickerActive(false);
      setRectSelectorActive(false);
      setSelectedElement(null);
      setHistoryOpen(false);
    } else if (tool === "History") {
      setHistoryOpen((prev) => !prev);
      setPickerActive(false);
      setRectSelectorActive(false);
      setPanActive(false);
      setSelectedElement(null);
    }
  };

  const handleElementSelected = (element: SelectedElement) => {
    setSelectedElement(element);
    setPickerActive(false);
    setRectSelectorActive(false);
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
        const label = e.data.label || pendingLabelRef.current || "AI modification";
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
    navigate(projectId ? `/editor/${projectId}` : '/editor');
  }, [history.push, projectId, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { width: deviceWidth, height: deviceHeight } = DEVICE_SIZES[device];

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <TopNav
        activeTab={codeEditorOpen ? "code-editor" : "editor"}
        projectId={projectId}
      />
      {!codeEditorOpen && (
        <SideNav
          activeTool={pickerActive ? "Element Picker" : rectSelectorActive ? "Rectangle Selector" : panActive ? "Pan Tool" : historyOpen ? "History" : undefined}
          onToolClick={handleToolClick}
        />
      )}
      <div className="flex min-h-0 flex-1">
        <main className="bg-background relative flex h-full min-w-0 flex-1 flex-col">
          {/* Toolbar */}
          <div className="px-md bg-surface-container relative z-10 flex h-10 items-center justify-between border-b border-[#334155]">
            {codeEditorOpen ? (
              <>
                {/* Code editor tabs */}
                <div className="flex items-center self-stretch">
                  <button
                    onClick={() => setCodeTab("html")}
                    className={`flex cursor-pointer items-center self-stretch border-b-2 px-3 font-mono text-xs transition-colors ${
                      codeTab === "html"
                        ? "border-violet-400 bg-slate-800 text-violet-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setCodeTab("css")}
                    className={`ml-1 flex cursor-pointer items-center self-stretch border-b-2 px-3 font-mono text-xs transition-colors ${
                      codeTab === "css"
                        ? "border-violet-400 bg-slate-800 text-violet-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    CSS
                  </button>
                </div>
                <button
                  onClick={() => codeEditorRef.current?.update()}
                  className="relative cursor-pointer rounded bg-violet-600 px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-violet-500"
                >
                  Save
                  {codeDirty && (
                    <span className="bg-on-primary-container absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full" />
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Device buttons lip — absolutely positioned */}
                <div className="left-md bg-background absolute top-0 bottom-[-5px] flex items-center rounded-b-lg border border-t-0 border-[#334155] px-1">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={`flex cursor-pointer items-center justify-center rounded p-1.5 px-2.5 ${device === "desktop" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className="material-symbols-outlined text-lg leading-none">desktop_windows</span>
                  </button>
                  <button
                    onClick={() => setDevice("tablet")}
                    className={`flex cursor-pointer items-center justify-center rounded p-1.5 px-2.5 ${device === "tablet" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className="material-symbols-outlined text-lg leading-none">tablet_mac</span>
                  </button>
                  <button
                    onClick={() => setDevice("phone")}
                    className={`flex cursor-pointer items-center justify-center rounded p-1.5 px-2.5 ${device === "phone" ? "text-primary-container" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    <span className="material-symbols-outlined text-lg leading-none">smartphone</span>
                  </button>
                </div>
                <span className="text-ui-small font-body-main mx-auto text-slate-400">
                  {deviceWidth} x {deviceHeight} ({zoom}%)
                </span>
                <div className="gap-sm flex items-center">
                  <button onClick={zoomIn} className="material-symbols-outlined cursor-pointer text-slate-500 hover:text-white">
                    zoom_in
                  </button>
                  <button onClick={zoomOut} className="material-symbols-outlined cursor-pointer text-slate-500 hover:text-white">
                    zoom_out
                  </button>
                  <div className="mx-2 h-4 w-px bg-slate-700" />
                  <button
                    onClick={history.undo}
                    disabled={!history.canUndo}
                    className={`material-symbols-outlined cursor-pointer ${history.canUndo ? "text-slate-500 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
                  >
                    undo
                  </button>
                  <button
                    onClick={history.redo}
                    disabled={!history.canRedo}
                    className={`material-symbols-outlined cursor-pointer ${history.canRedo ? "text-slate-500 hover:text-white" : "cursor-not-allowed text-slate-700"}`}
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
              onDirtyChange={setCodeDirty}
            />
          ) : (
            <CanvasPreview
              ref={canvasRef}
              pickerActive={pickerActive}
              rectSelectorActive={rectSelectorActive}
              panActive={panActive}
              selectedMpId={selectedElement?.mpId || null}
              selectedSelector={selectedElement ? (selectedElement.tagName + (selectedElement.id ? '#' + selectedElement.id : selectedElement.className ? '.' + selectedElement.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) : undefined}
              onElementSelected={handleElementSelected}
              onElementDeselected={() => { setSelectedElement(null); setPickerActive(false); }}
              zoom={zoom}
              viewportWidth={deviceWidth}
              projectId={projectId}
              htmlContent={history.currentHtml}
              assetsBasePath={assetsBasePath}
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
              onClose={() => { setSelectedElement(null); setPickerActive(false); }}
              onApplyModification={handleApplyModification}
              getElementHTML={() => canvasRef.current?.getElementHTML(selectedElement.mpId) ?? Promise.resolve(null)}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
