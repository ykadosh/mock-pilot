import type { CanvasPreviewHandle, ElementTreeNode } from "./CanvasPreview.types";
import { useElementTree, useExpandedNodes, useLayerActions } from "./LayersPanel.hooks";
import { formatLayerLabel } from "./LayersPanel.utils";
import { SidePanel } from "./ui/SidePanel";

interface LayersPanelProps {
  canvasRef: React.RefObject<CanvasPreviewHandle | null>;
  selectedMpId?: string | null;
  htmlVersion: unknown;
  onClose: () => void;
}

interface NodeRowHandlers {
  expanded: Set<string>;
  toggle: (mpId: string) => void;
  onHover: (mpId: string) => void;
  onLeave: () => void;
  onSelect: (mpId: string) => void;
  selectedMpId?: string | null;
}

function NodeChevron({ hasChildren, isExpanded, onClick }: { hasChildren: boolean; isExpanded: boolean; onClick: (e: React.MouseEvent) => void }) {
  if (!hasChildren) return <span className="inline-block h-4 w-4 shrink-0" />;
  return (
    <button onClick={onClick} className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center text-slate-500 hover:text-slate-200">
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isExpanded ? "expand_more" : "chevron_right"}</span>
    </button>
  );
}

function NodeRow({ node, depth, handlers }: { node: ElementTreeNode; depth: number; handlers: NodeRowHandlers }) {
  const hasChildren = node.children.length > 0;
  const isExpanded = handlers.expanded.has(node.mpId);
  const isSelected = handlers.selectedMpId === node.mpId;
  const rowClass = `flex cursor-pointer items-center gap-1 rounded py-0.5 pr-1 text-[11px] transition-colors ${
    isSelected ? "bg-violet-600/20 text-violet-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
  }`;
  return (
    <>
      <div
        onMouseEnter={() => handlers.onHover(node.mpId)}
        onMouseLeave={handlers.onLeave}
        onClick={() => handlers.onSelect(node.mpId)}
        className={rowClass}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <NodeChevron hasChildren={hasChildren} isExpanded={isExpanded} onClick={(e) => { e.stopPropagation(); handlers.toggle(node.mpId); }} />
        <span className="truncate font-mono">{formatLayerLabel(node)}</span>
      </div>
      {hasChildren && isExpanded && node.children.map((child) => (
        <NodeRow key={child.mpId} node={child} depth={depth + 1} handlers={handlers} />
      ))}
    </>
  );
}

function LayersTree({ tree, handlers }: { tree: ElementTreeNode[]; handlers: NodeRowHandlers }) {
  if (tree.length === 0) {
    return <p className="mt-4 text-center text-xs text-slate-500">No elements to display</p>;
  }
  return (
    <div className="flex flex-col">
      {tree.map((node) => (
        <NodeRow key={node.mpId} node={node} depth={0} handlers={handlers} />
      ))}
    </div>
  );
}

export function LayersPanel({ canvasRef, selectedMpId, htmlVersion, onClose }: LayersPanelProps) {
  const tree = useElementTree(canvasRef, htmlVersion);
  const { expanded, toggle } = useExpandedNodes(tree, selectedMpId);
  const { onHover, onLeave, onSelect } = useLayerActions(canvasRef);

  return (
    <SidePanel title="LAYERS" onClose={onClose}>
      <div className="p-sm">
        <LayersTree tree={tree} handlers={{ expanded, toggle, onHover, onLeave, onSelect, selectedMpId }} />
      </div>
    </SidePanel>
  );
}
