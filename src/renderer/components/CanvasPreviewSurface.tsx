import type { RefObject } from "react";
import { CanvasDottedBackground } from "./CanvasDottedBackground";
import { CanvasPreviewToolbar } from "./CanvasPreviewToolbar";
import type { CanvasRect, SelectionRect } from "./CanvasPreview.types";
import { buildPreviewSrcDoc, getCursorClass } from "./CanvasPreview.utils";
import { CanvasPreviewViewport } from "./CanvasPreviewViewport";

interface CanvasPreviewSurfaceProps {
  assetsBasePath?: string | null;
  html: string | null;
  iframeHeight: number;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  isPanning: boolean;
  onElementDeselected?: () => void;
  onLoad: () => void;
  panActive?: boolean;
  pickerActive?: boolean;
  rectSelectorActive?: boolean;
  scale: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  selectedMpId?: string | null;
  selectedRect: CanvasRect | null;
  selectedSelector?: string;
  selectionRect: SelectionRect | null;
  viewportWidth: number;
}

function sendPickerAction(iframe: HTMLIFrameElement | null, selectedMpId: string | null | undefined, action: string) {
  if (!iframe?.contentWindow || !selectedMpId) return;
  iframe.contentWindow.postMessage({ type: action, mpId: selectedMpId }, "*");
}

export function CanvasPreviewSurface(props: CanvasPreviewSurfaceProps) {
  const { assetsBasePath, html, iframeHeight, iframeRef, isPanning, onElementDeselected, onLoad, panActive, pickerActive, rectSelectorActive, scale, scrollContainerRef, selectedMpId, selectedRect, selectedSelector, selectionRect, viewportWidth } = props;
  const srcDoc = buildPreviewSrcDoc(html, assetsBasePath);
  const containerCursorClass = getCursorClass({ panActive, isPanning, rectSelectorActive });
  const containerClass = `flex-1 overflow-auto${containerCursorClass ? ` ${containerCursorClass}` : ""}`;
  const onToolbarDelete = () => {
    sendPickerAction(iframeRef.current, selectedMpId, "picker-action-delete");
    onElementDeselected?.();
  };

  return (
    <div ref={scrollContainerRef} className={containerClass}>
      <CanvasDottedBackground>
        <div data-canvas-wrapper className="relative" style={{ width: `${viewportWidth * scale}px` }}>
          <CanvasPreviewToolbar rect={selectedRect} scale={scale} selectedMpId={selectedMpId} selectedSelector={selectedSelector} onDelete={onToolbarDelete} onDeselect={() => onElementDeselected?.()} onPickerAction={(action) => sendPickerAction(iframeRef.current, selectedMpId, action)} />
          <CanvasPreviewViewport html={html} iframeHeight={iframeHeight} iframeRef={iframeRef} isPanning={isPanning} onLoad={onLoad} panActive={panActive} pickerActive={pickerActive} rectSelectorActive={rectSelectorActive} scale={scale} selectionRect={selectionRect} srcDoc={srcDoc} viewportWidth={viewportWidth} />
        </div>
      </CanvasDottedBackground>
    </div>
  );
}
