import type { SelectedElement } from "../pages/Editor";
import { PropertiesPanelDetails } from "./PropertiesPanelDetails";
import { buildElementSelector } from "./PropertiesPanel.utils";
import { SidePanel } from "./ui/SidePanel";

interface PropertiesPanelProps {
  element: SelectedElement | null;
  onClose: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="material-symbols-outlined text-3xl text-slate-600">ads_click</span>
      <p className="text-xs text-slate-500">Select an element to see its properties</p>
      <p className="text-[10px] text-slate-600">Use the Element Picker, Rectangle Selector, or Layers panel to select an element.</p>
    </div>
  );
}

export function PropertiesPanel({ element, onClose }: PropertiesPanelProps) {
  if (!element) {
    return (
      <SidePanel title="ELEMENT PROPERTIES" onClose={onClose}>
        <EmptyState />
      </SidePanel>
    );
  }

  const selector = buildElementSelector(element);

  return (
    <SidePanel title="ELEMENT PROPERTIES" onClose={onClose}>
      <div className="p-sm border-b border-slate-800 bg-violet-900/20">
        <div className="gap-sm flex items-center">
          <span className="material-symbols-outlined text-sm text-violet-400">ads_click</span>
          <span className="flex-1 truncate font-mono text-[11px] text-violet-300">{selector}</span>
        </div>
      </div>
      <PropertiesPanelDetails element={element} />
    </SidePanel>
  );
}
