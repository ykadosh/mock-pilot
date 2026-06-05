import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CropPreview } from "../types";
import { DimensionPill } from "./CropCaptureDialogPanels";

const HANDLE_HIT_SIZE = 10;

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
  const computedScale = computeScale(stageRect, preview.viewportWidth, virtualPageHeight);
  // Lock the scale during an active drag so the handle stays under the cursor.
  // On release we drop the lock and the page rect snaps to its proportional fit.
  const [lockedScale, setLockedScale] = useState<number | null>(null);
  const scale = lockedScale ?? computedScale;
  const handleDrag = useHandleDrag({
    cropTop, cropHeight, scale, setRegion,
    onStart: useCallback(() => setLockedScale(computedScale), [computedScale]),
    onEnd: useCallback(() => setLockedScale(null), []),
  });
  return (
    <div className="bg-surface-container-lowest p-lg relative flex flex-1 flex-col items-center justify-center overflow-hidden">
      <div className="technical-grid absolute inset-0 opacity-10" />
      <div ref={stageRef} className="relative flex min-h-0 w-full max-w-2xl flex-1 items-start justify-center overflow-hidden">
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
    <div className="bg-surface border-outline-variant relative overflow-hidden border shadow-xl" style={{ width: pageWidth, height: pageHeight }}>
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
    <div onMouseDown={onMouseDown} className="bg-primary/20 hover:bg-primary absolute inset-x-0 z-30 flex items-center justify-center transition-colors" style={{ top: cropPx - HANDLE_HIT_SIZE / 2, height: HANDLE_HIT_SIZE, cursor: "ns-resize" }} data-kind={kind}>
      <div className="bg-primary border-surface h-1.5 w-12 rounded-full border" />
    </div>
  );
}

function computeScale(stageRect: { width: number; height: number } | null, viewportWidth: number, virtualPageHeight: number) {
  if (!stageRect) return 0;
  const byWidth = stageRect.width / viewportWidth;
  const byHeight = stageRect.height / virtualPageHeight;
  return Math.min(byWidth, byHeight);
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

interface DragOptions {
  cropTop: number;
  cropHeight: number;
  scale: number;
  setRegion: (top: number, height: number) => void;
  onStart: () => void;
  onEnd: () => void;
}

function useHandleDrag({ cropTop, cropHeight, scale, setRegion, onStart, onEnd }: DragOptions) {
  const dragState = useRef<{ kind: "top" | "bottom"; startY: number; startTop: number; startHeight: number } | null>(null);
  const callbacksRef = useRef({ onStart, onEnd });
  callbacksRef.current = { onStart, onEnd };
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
      callbacksRef.current.onEnd();
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
    callbacksRef.current.onStart();
  }, [cropTop, cropHeight]);
}
