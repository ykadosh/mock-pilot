import { forwardRef, useRef } from "react";
import { useCanvasPreviewHandle, useCanvasHtml, useIframeSetup } from "./CanvasPreview.hooks";
import { usePanMode, useRectSelection } from "./CanvasPreview.interactionHooks";
import { CanvasPreviewSurface } from "./CanvasPreviewSurface";
import type { CanvasPreviewHandle, CanvasPreviewProps } from "./CanvasPreview.types";

export type { CanvasPreviewHandle } from "./CanvasPreview.types";

export const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview({
  pickerActive,
  rectSelectorActive,
  panActive,
  selectedMpId,
  selectedSelector,
  onElementSelected,
  onElementDeselected,
  zoom = 100,
  viewportWidth = 1280,
  projectId: _projectId,
  htmlContent,
  assetsBasePath,
}, ref) {
  const html = useCanvasHtml(htmlContent);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useCanvasPreviewHandle(ref, iframeRef);
  const { handleIframeLoad, iframeHeight, selectedRect } = useIframeSetup({ iframeRef, pickerActive, selectedMpId, viewportWidth, onElementSelected, onElementDeselected });
  const scale = zoom / 100;
  const isPanning = usePanMode(scrollContainerRef, panActive);
  const selectionRect = useRectSelection({ iframeRef, rectSelectorActive, scale, scrollContainerRef });

  return <CanvasPreviewSurface assetsBasePath={assetsBasePath} html={html} iframeHeight={iframeHeight} iframeRef={iframeRef} isPanning={isPanning} onElementDeselected={onElementDeselected} onLoad={handleIframeLoad} panActive={panActive} pickerActive={pickerActive} rectSelectorActive={rectSelectorActive} scale={scale} scrollContainerRef={scrollContainerRef} selectedMpId={selectedMpId} selectedRect={selectedRect} selectedSelector={selectedSelector} selectionRect={selectionRect} viewportWidth={viewportWidth} />;
});
