import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CropPreview } from "../types";
import { DimensionPill } from "./CropCaptureDialogPanels";

const HANDLE_HIT_SIZE = 12;
const SCROLL_MARGIN = 32;

interface CropCanvasProps {
  cropTop: number;
  cropHeight: number;
  preview: CropPreview;
  setRegion: (top: number, height: number) => void;
}

export function CropCanvas({ cropTop, cropHeight, preview, setRegion }: CropCanvasProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const virtualPageHeight = useMemo(() => Math.max(preview.naturalHeight, cropTop + cropHeight), [cropTop, cropHeight, preview.naturalHeight]);
  const [stageRect, setStageRect] = useState<{ width: number; height: number } | null>(null);
  useStageMeasurement(stageRef, setStageRect);
  // Width-only scale: image always fills stage width at its true aspect ratio. When the
  // page rect grows taller than the stage (extended crop), the stage scrolls vertically.
  const scale = stageRect ? stageRect.width / preview.viewportWidth : 0;
  const handleDrag = useHandleDrag({ cropTop, cropHeight, scale, stageRef, setRegion });
  useAutoScrollOnCropChange(stageRef, (cropTop + cropHeight) * scale);
  return (
    <div className="bg-surface-container-lowest p-lg relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="technical-grid absolute inset-0 opacity-10" />
      <div ref={stageRef} className="relative min-h-0 w-full max-w-2xl flex-1 overflow-x-hidden overflow-y-auto">
        {stageRect && scale > 0 && (
          <PageRect cropTop={cropTop} cropHeight={cropHeight} handleDrag={handleDrag} preview={preview} scale={scale} virtualPageHeight={virtualPageHeight} />
        )}
      </div>
      <DimensionPill cropHeight={cropHeight} viewportWidth={preview.viewportWidth} />
    </div>
  );
}

interface PageRectProps {
  cropTop: number;
  cropHeight: number;
  handleDrag: (handle: "top" | "bottom", event: React.MouseEvent) => void;
  preview: CropPreview;
  scale: number;
  virtualPageHeight: number;
}

function PageRect({ cropTop, cropHeight, handleDrag, preview, scale, virtualPageHeight }: PageRectProps) {
  const pageWidth = preview.viewportWidth * scale;
  const pageHeight = virtualPageHeight * scale;
  const imageHeightPx = preview.naturalHeight * scale;
  const cropTopPx = cropTop * scale;
  const cropHeightPx = cropHeight * scale;
  const cropBottomPx = cropTopPx + cropHeightPx;
  return (
    <div className="bg-surface border-outline-variant relative mx-auto overflow-hidden border shadow-xl" style={{ width: pageWidth, height: pageHeight }}>
      <div className="technical-grid absolute inset-x-0 bottom-0 opacity-30" style={{ top: imageHeightPx }} />
      <img alt="Page preview" src={preview.dataUrl} className="absolute inset-x-0 top-0 w-full select-none" draggable={false} style={{ height: imageHeightPx }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/70" style={{ height: cropTopPx }} />
      <div className="pointer-events-none absolute inset-x-0 bg-black/70" style={{ top: cropBottomPx, bottom: 0 }} />
      <div className="border-primary pointer-events-none absolute inset-x-0 border-2 border-dashed" style={{ top: cropTopPx, height: cropHeightPx }}>
        <div className="border-primary/20 absolute top-1/3 w-full border-t" />
        <div className="border-primary/20 absolute top-2/3 w-full border-t" />
        <div className="border-primary/20 absolute left-1/3 h-full border-l" />
        <div className="border-primary/20 absolute left-2/3 h-full border-l" />
      </div>
      <CropHandle cropPx={cropTopPx} kind="top" onMouseDown={(e) => handleDrag("top", e)} />
      <CropHandle cropPx={cropBottomPx} kind="bottom" onMouseDown={(e) => handleDrag("bottom", e)} />
    </div>
  );
}

function CropHandle({ cropPx, kind, onMouseDown }: { cropPx: number; kind: "top" | "bottom"; onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} className="group absolute inset-x-0 z-30 flex items-center justify-center" style={{ top: cropPx - HANDLE_HIT_SIZE / 2, height: HANDLE_HIT_SIZE, cursor: "ns-resize" }} data-kind={kind}>
      <div className="bg-primary border-surface h-1.5 w-12 rounded-full border transition-transform group-hover:scale-110" />
    </div>
  );
}

function useStageMeasurement(ref: React.RefObject<HTMLDivElement | null>, set: (rect: { width: number; height: number } | null) => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) set({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    set({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, [ref, set]);
}

// While the user drags, keep the active handle visible by scrolling the stage if the
// crop bottom edge moves outside the visible area.
function useAutoScrollOnCropChange(stageRef: React.RefObject<HTMLDivElement | null>, cropBottomScreenPx: number) {
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const visibleBottom = el.scrollTop + el.clientHeight;
    if (cropBottomScreenPx > visibleBottom - SCROLL_MARGIN) {
      el.scrollTop = Math.min(el.scrollHeight, cropBottomScreenPx - el.clientHeight + SCROLL_MARGIN);
    } else if (cropBottomScreenPx < el.scrollTop + SCROLL_MARGIN) {
      el.scrollTop = Math.max(0, cropBottomScreenPx - SCROLL_MARGIN);
    }
  }, [stageRef, cropBottomScreenPx]);
}

interface DragOptions {
  cropTop: number;
  cropHeight: number;
  scale: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  setRegion: (top: number, height: number) => void;
}

function useHandleDrag({ cropTop, cropHeight, scale, setRegion }: DragOptions) {
  const dragState = useRef<{ kind: "top" | "bottom"; startY: number; startTop: number; startHeight: number } | null>(null);
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const state = dragState.current;
      if (!state || scale <= 0) return;
      const deltaPx = (event.clientY - state.startY) / scale;
      if (state.kind === "top") {
        setRegion(state.startTop + deltaPx, state.startHeight - deltaPx);
      } else {
        setRegion(state.startTop, state.startHeight + deltaPx);
      }
    };
    const onUp = () => {
      if (!dragState.current) return;
      dragState.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scale, setRegion]);
  return useCallback((kind: "top" | "bottom", event: React.MouseEvent) => {
    event.preventDefault();
    dragState.current = { kind, startY: event.clientY, startTop: cropTop, startHeight: cropHeight };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, [cropTop, cropHeight]);
}
