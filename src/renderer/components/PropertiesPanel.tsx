import type { SelectedElement } from "../pages/Editor";
import { usePropertiesPanelModifier } from "./PropertiesPanel.hooks";
import { PropertiesPanelDetails } from "./PropertiesPanelDetails";
import { PropertiesPanelModifier } from "./PropertiesPanelModifier";
import { buildElementSelector } from "./PropertiesPanel.utils";
import { SidePanel } from "./ui/SidePanel";

interface PropertiesPanelProps {
  element: SelectedElement;
  onClose: () => void;
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  getElementHTML?: () => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
}

export function PropertiesPanel({ element, onClose, onApplyModification, getElementHTML }: PropertiesPanelProps) {
  const modifier = usePropertiesPanelModifier({ element, onApplyModification, getElementHTML });
  const selector = buildElementSelector(element);

  return (
    <SidePanel title="ELEMENT PROPERTIES" onClose={onClose}>
      <div className="p-sm border-b border-slate-800 bg-violet-900/20">
        <div className="gap-sm flex items-center">
          <span className="material-symbols-outlined text-sm text-violet-400">ads_click</span>
          <span className="flex-1 truncate font-mono text-[11px] text-violet-300">{selector}</span>
        </div>
      </div>
      <PropertiesPanelModifier {...modifier} />
      <PropertiesPanelDetails element={element} />
    </SidePanel>
  );
}
