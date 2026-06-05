import { useCallback, useEffect, useRef, useState } from "react";
import type { CropPreview } from "../types";
import { DimensionPill } from "./CropCaptureDialogPanels";

const HANDLE_HIT_SIZE = 12;
const HANDLE_MARGIN = HANDLE_HIT_SIZE / 2;
const PAGE_HANDLE_GAP = 10;
const PAGE_HANDLE_HEIGHT = 14;
const SCROLL_MARGIN = 32;

type HandleKind = "top" | "bottom" | "page";

interface CropCanvasProps {
  cropTop: number;
  cropHeight: number;
  pageHeight: number;
  preview: CropPreview;
  setRegion: (top: number, height: number) => void;
  setPageHeight: (height: number) => void;
}

export function CropCanvas({ cropTop, cropHeight, pageHeight, preview, setRegion, setPageHeight }: CropCanvasProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageRect, setStageRect] = useState<{ width: number; height: number } | null>(null);
  useStageMeasurement(stageRef, setStageRect);
  // Width-only scale: image always fills stage width at its true aspect ratio. When the
  // page rect grows taller than the stage (extended page), the stage scrolls vertically.
  const scale = stageRect ? stageRect.width / preview.viewportWidth : 0;
  const handleDrag = useHandleDrag({ cropTop, cropHeight, pageHeight, scale, setRegion, setPageHeight });
  // Auto-scroll target: bottom of the page height handle so the whole interactive
  // area stays in view while dragging.
  const autoScrollTarget = pageHeight * scale + HANDLE_MARGIN * 2 + PAGE_HANDLE_GAP + PAGE_HANDLE_HEIGHT;
  useAutoScrollOnCropChange(stageRef, autoScrollTarget);
  return (
    <div className="bg-surface-container-lowest p-lg relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="technical-grid absolute inset-0 opacity-10" />
      <div ref={stageRef} className="relative min-h-0 w-full max-w-2xl flex-1 overflow-x-hidden overflow-y-auto">
        {stageRect && scale > 0 && (
          <>
            <PageRect cropTop={cropTop} cropHeight={cropHeight} handleDrag={handleDrag} pageHeight={pageHeight} preview={preview} scale={scale} />
            <PageHeightHandle pageWidth={preview.viewportWidth * scale} onMouseDown={(e) => handleDrag("page", e)} />
          </>
        )}
      </div>
      <DimensionPill cropHeight={cropHeight} viewportWidth={preview.viewportWidth} />
    </div>
  );
}

interface PageRectProps {
  cropTop: number;
  cropHeight: number;
  handleDrag: (handle: HandleKind, event: React.MouseEvent) => void;
  pageHeight: number;
  preview: CropPreview;
  scale: number;
}

function PageRect({ cropTop, cropHeight, handleDrag, pageHeight, preview, scale }: PageRectProps) {
  const pageWidth = preview.viewportWidth * scale;
  const pageHeightPx = pageHeight * scale;
  const imageHeightPx = preview.naturalHeight * scale;
  const cropTopPx = cropTop * scale;
  const cropHeightPx = cropHeight * scale;
  const cropBottomPx = cropTopPx + cropHeightPx;
  // Outer wrapper has no clipping so handles can poke past the page rect edges.
  // Vertical margin gives the handles room above/below within the scroll container.
  return (
    <div className="relative mx-auto" style={{ width: pageWidth, height: pageHeightPx, marginTop: HANDLE_MARGIN, marginBottom: HANDLE_MARGIN }}>
      <div className="bg-surface border-outline-variant absolute inset-0 overflow-hidden border shadow-xl">
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

function PageHeightHandle({ pageWidth, onMouseDown }: { pageWidth: number; onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} title="Drag to change page height" className="group mx-auto flex items-center justify-center" style={{ width: pageWidth, height: PAGE_HANDLE_HEIGHT, marginTop: PAGE_HANDLE_GAP, cursor: "ns-resize" }} data-kind="page">
      <div className="bg-secondary border-surface h-1.5 w-20 rounded-full border transition-transform group-hover:scale-110" />
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

// While the user drags, scroll the stage so the lower interactive edge stays in view.
function useAutoScrollOnCropChange(stageRef: React.RefObject<HTMLDivElement | null>, targetScreenPx: number) {
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (targetScreenPx > el.scrollTop + el.clientHeight - SCROLL_MARGIN) {
      el.scrollTop = Math.min(el.scrollHeight, targetScreenPx - el.clientHeight + SCROLL_MARGIN);
    }
  }, [stageRef, targetScreenPx]);
}

interface DragOptions {
  cropTop: number;
  cropHeight: number;
  pageHeight: number;
  scale: number;
  setRegion: (top: number, height: number) => void;
  setPageHeight: (height: number) => void;
}

function useHandleDrag({ cropTop, cropHeight, pageHeight, scale, setRegion, setPageHeight }: DragOptions) {
  const dragState = useRef<{ kind: HandleKind; startY: number; startTop: number; startHeight: number; startPageHeight: number } | null>(null);
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const state = dragState.current;
      if (!state || scale <= 0) return;
      const deltaPx = (event.clientY - state.startY) / scale;
      if (state.kind === "top") setRegion(state.startTop + deltaPx, state.startHeight - deltaPx);
      else if (state.kind === "bottom") setRegion(state.startTop, state.startHeight + deltaPx);
      else setPageHeight(state.startPageHeight + deltaPx);
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
  }, [scale, setRegion, setPageHeight]);
  return useCallback((kind: HandleKind, event: React.MouseEvent) => {
    event.preventDefault();
    dragState.current = { kind, startY: event.clientY, startTop: cropTop, startHeight: cropHeight, startPageHeight: pageHeight };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, [cropTop, cropHeight, pageHeight]);
}
