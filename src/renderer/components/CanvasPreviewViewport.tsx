import type { RefObject } from "react";
import type { SelectionRect } from "./CanvasPreview.types";
import { getCursorClass } from "./CanvasPreview.utils";

interface CanvasPreviewViewportProps {
  html: string | null;
  iframeHeight: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isPanning: boolean;
  onLoad: () => void;
  panActive?: boolean;
  pickerActive?: boolean;
  rectSelectorActive?: boolean;
  scale: number;
  selectionRect: SelectionRect | null;
  srcDoc: string | null;
  viewportWidth: number;
}

function SelectionOverlay({ rect, scale }: { rect: SelectionRect; scale: number }) {
  return (
    <div className="pointer-events-none absolute z-30" style={{ top: `${rect.y * scale}px`, left: `${rect.x * scale}px`, width: `${rect.w * scale}px`, height: `${rect.h * scale}px`, border: "2px dashed #7c3aed", background: "rgba(124, 58, 237, 0.08)", borderRadius: "2px" }} />
  );
}

function EmptyCanvasState() {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center text-slate-400">
      <span className="material-symbols-outlined mb-md text-4xl">web</span>
      <p className="text-sm">No website captured yet</p>
      <p className="mt-xs text-xs text-slate-500">Create a new project to capture a website</p>
    </div>
  );
}

export function CanvasPreviewViewport(props: CanvasPreviewViewportProps) {
  const { html, iframeHeight, iframeRef, isPanning, onLoad, panActive, pickerActive, rectSelectorActive, scale, selectionRect, srcDoc, viewportWidth } = props;
  if (!html) return <EmptyCanvasState />;

  const overlayCursorClass = getCursorClass({ panActive, isPanning, rectSelectorActive, fallback: "cursor-default" });

  return (
    <>
      {selectionRect && <SelectionOverlay rect={selectionRect} scale={scale} />}
      <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl" style={{ width: `${viewportWidth * scale}px`, height: `${iframeHeight * scale}px` }}>
        <iframe ref={iframeRef} srcDoc={srcDoc ?? undefined} className="origin-top-left border-none" style={{ width: `${viewportWidth}px`, height: `${iframeHeight}px`, transform: `scale(${scale})` }} sandbox="allow-same-origin allow-scripts" title="Website Preview" onLoad={onLoad} />
        {!pickerActive && <div className={`absolute inset-0 ${overlayCursorClass}`} />}
      </div>
    </>
  );
}
