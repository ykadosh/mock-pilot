import { useState } from "react";
import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import { CanvasPreview } from "../components/CanvasPreview";
import { PropertiesPanel } from "../components/PropertiesPanel";

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  computedStyle: Record<string, string>;
}

export function Editor() {
  const [pickerActive, setPickerActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [zoom, setZoom] = useState(100);

  const handleToolClick = (tool: string) => {
    if (tool === "Element Picker") {
      setPickerActive((prev) => !prev);
    }
  };

  const handleElementSelected = (element: SelectedElement) => {
    setSelectedElement(element);
    setPickerActive(false);
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 25));

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <SideNav
          activeTab="editor"
          activeTool={pickerActive ? "Element Picker" : undefined}
          onToolClick={handleToolClick}
        />
        <main className="flex-1 min-w-0 bg-[#020617] flex flex-col h-full relative">
          {/* Toolbar */}
          <div className="h-10 border-b border-[#334155] flex items-center justify-between px-md bg-surface-container">
            <div className="flex items-center gap-md">
              <div className="flex bg-[#020617] rounded p-0.5 border border-[#334155]">
                <button className="p-1 px-2 text-primary-container">
                  <span className="material-symbols-outlined text-lg">
                    desktop_windows
                  </span>
                </button>
                <button className="p-1 px-2 text-slate-500 hover:text-slate-300">
                  <span className="material-symbols-outlined text-lg">
                    tablet_mac
                  </span>
                </button>
                <button className="p-1 px-2 text-slate-500 hover:text-slate-300">
                  <span className="material-symbols-outlined text-lg">
                    smartphone
                  </span>
                </button>
              </div>
              <span className="text-ui-small font-body-main text-slate-400">
                1280 x 800 ({zoom}%)
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <button onClick={zoomIn} className="material-symbols-outlined text-slate-500 hover:text-white cursor-pointer">
                zoom_in
              </button>
              <button onClick={zoomOut} className="material-symbols-outlined text-slate-500 hover:text-white cursor-pointer">
                zoom_out
              </button>
              <div className="w-px h-4 bg-slate-700 mx-2" />
              <button className="material-symbols-outlined text-slate-500 hover:text-white">
                undo
              </button>
              <button className="material-symbols-outlined text-slate-500 hover:text-white">
                redo
              </button>
            </div>
          </div>

          {/* Canvas */}
          <CanvasPreview
            pickerActive={pickerActive}
            onElementSelected={handleElementSelected}
            zoom={zoom}
          />

          {/* Properties Panel */}
          {selectedElement && (
            <PropertiesPanel
              element={selectedElement}
              onClose={() => setSelectedElement(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
