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

  return (
    <SidePanel title="ELEMENT PROPERTIES" onClose={onClose}>
      <PropertiesPanelDetails element={element} selector={buildElementSelector(element)} />
      <PropertiesPanelModifier {...modifier} />
    </SidePanel>
  );
}
