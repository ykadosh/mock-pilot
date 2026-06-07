import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Tooltip } from "./ui/Tooltip";
import type { CanvasRect } from "./CanvasPreview.types";

interface CanvasPreviewToolbarProps {
  rect: CanvasRect | null;
  scale: number;
  selectedMpId?: string | null;
  selectedSelector?: string;
  onDelete: () => void;
  onDeselect: () => void;
  onPickerAction: (action: string) => void;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

const TOOLBAR_GAP = 4;

function ToolbarButton({ icon, onClick, title }: { icon: string; onClick: () => void; title: string }) {
  return (
    <Tooltip label={title} placement="bottom">
      <button onClick={onClick} className="cursor-pointer rounded p-0.5 transition-colors hover:bg-white/20" aria-label={title}>
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{icon}</span>
      </button>
    </Tooltip>
  );
}

function clampToolbarPosition({ toolbar, scrollContainer, rect, scale }: { toolbar: HTMLDivElement; scrollContainer: HTMLElement | null; rect: CanvasRect; scale: number }) {
  const wrapper = toolbar.offsetParent as HTMLElement | null;
  if (!wrapper) return null;
  const elTop = rect.top * scale;
  const elLeft = rect.left * scale;
  const elHeight = rect.height * scale;
  const tw = toolbar.offsetWidth;
  const th = toolbar.offsetHeight;

  // Default visible region: the entire wrapper (no clamping beyond it).
  let visLeft = 0;
  let visTop = 0;
  let visRight = wrapper.offsetWidth;
  let visBottom = wrapper.offsetHeight;

  if (scrollContainer) {
    const containerRect = scrollContainer.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    visLeft = Math.max(0, containerRect.left - wrapperRect.left);
    visTop = Math.max(0, containerRect.top - wrapperRect.top);
    visRight = Math.min(wrapper.offsetWidth, containerRect.right - wrapperRect.left);
    visBottom = Math.min(wrapper.offsetHeight, containerRect.bottom - wrapperRect.top);
  }

  // Prefer above the selected element; flip below if no room; otherwise pin to nearest edge.
  let top = elTop - th - TOOLBAR_GAP;
  if (top < visTop) {
    const below = elTop + elHeight + TOOLBAR_GAP;
    top = below + th <= visBottom ? below : Math.min(Math.max(visTop, elTop), visBottom - th);
  }
  top = Math.min(Math.max(top, visTop), Math.max(visTop, visBottom - th));

  let left = elLeft;
  left = Math.min(Math.max(left, visLeft), Math.max(visLeft, visRight - tw));

  return { top, left };
}

function useClampedToolbarPosition({ toolbarRef, scrollContainerRef, rect, scale, enabled }: { toolbarRef: RefObject<HTMLDivElement | null>; scrollContainerRef?: RefObject<HTMLDivElement | null>; rect: CanvasRect | null; scale: number; enabled: boolean }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!enabled || !rect) { setPos(null); return; }
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const scrollContainer = scrollContainerRef?.current ?? null;
    const update = () => {
      const next = clampToolbarPosition({ toolbar, scrollContainer, rect, scale });
      if (next) setPos(next);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(toolbar);
    if (scrollContainer) ro.observe(scrollContainer);
    scrollContainer?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      scrollContainer?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [rect, scale, enabled, toolbarRef, scrollContainerRef]);
  return pos;
}

export function CanvasPreviewToolbar({ rect, scale, selectedMpId, selectedSelector, onDelete, onDeselect, onPickerAction, scrollContainerRef }: CanvasPreviewToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pos = useClampedToolbarPosition({ toolbarRef, scrollContainerRef, rect, scale, enabled: !!selectedMpId });

  if (!selectedMpId || !rect) return null;

  const style = pos
    ? { top: `${pos.top}px`, left: `${pos.left}px`, visibility: "visible" as const }
    : { top: 0, left: 0, visibility: "hidden" as const };

  return (
    <div ref={toolbarRef} className="absolute z-20 flex items-center rounded bg-[#7c3aed] px-2 py-1 font-mono text-[10px] whitespace-nowrap text-white shadow-lg" style={style}>
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
