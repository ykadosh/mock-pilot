import type { CanvasRect } from "./CanvasPreview.types";

interface CanvasPreviewToolbarProps {
  rect: CanvasRect | null;
  scale: number;
  selectedMpId?: string | null;
  selectedSelector?: string;
  onDelete: () => void;
  onDeselect: () => void;
  onPickerAction: (action: string) => void;
}

function ToolbarButton({ icon, onClick, title }: { icon: string; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} className="material-symbols-outlined cursor-pointer rounded p-0.5 transition-colors hover:bg-white/20" style={{ fontSize: "16px" }} title={title}>
      {icon}
    </button>
  );
}

export function CanvasPreviewToolbar({ rect, scale, selectedMpId, selectedSelector, onDelete, onDeselect, onPickerAction }: CanvasPreviewToolbarProps) {
  if (!selectedMpId || !rect) return null;

  return (
    <div className="absolute z-20 flex items-center rounded bg-[#7c3aed] px-2 py-1 font-mono text-[10px] whitespace-nowrap text-white shadow-lg" style={{ top: `${Math.max(0, rect.top * scale - 28)}px`, left: `${rect.left * scale}px` }}>
      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>ads_click</span>
      <span className="ml-1">{selectedSelector || "Element"}</span>
      <div className="ml-2 flex items-center gap-0.5 border-l border-white/30 pl-2">
        <ToolbarButton icon="content_copy" onClick={() => onPickerAction("picker-action-duplicate")} title="Duplicate" />
        <ToolbarButton icon="delete" onClick={onDelete} title="Delete" />
        <ToolbarButton icon="arrow_upward" onClick={() => onPickerAction("picker-action-move-up")} title="Move up" />
        <ToolbarButton icon="arrow_downward" onClick={() => onPickerAction("picker-action-move-down")} title="Move down" />
        <ToolbarButton icon="expand_content" onClick={() => onPickerAction("picker-action-select-parent")} title="Select parent" />
        <ToolbarButton icon="close" onClick={onDeselect} title="Deselect" />
      </div>
    </div>
  );
}
