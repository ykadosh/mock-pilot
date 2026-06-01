import { forwardRef, useEffect, useRef } from "react";
import { useCanvasHtml, useIframeSetup } from "./CanvasPreview.hooks";
import { useCanvasPreviewHandle } from "./CanvasPreview.handle";
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
  reloadEpoch,
  assetsBasePath,
}, ref) {
  const html = useCanvasHtml(htmlContent, reloadEpoch);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scale = zoom / 100;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  useCanvasPreviewHandle(ref, { iframeRef, scrollContainerRef, scaleRef });
  const { handleIframeLoad, iframeHeight, selectedRect } = useIframeSetup({ iframeRef, pickerActive, selectedMpId, viewportWidth, onElementSelected, onElementDeselected });
  const isPanning = usePanMode(scrollContainerRef, panActive);
  const selectionRect = useRectSelection({ iframeRef, rectSelectorActive, scale, scrollContainerRef });

  useEffect(() => {
    if (!html) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ left: 220, top: 220 });
  }, [_projectId, html]);

  return <CanvasPreviewSurface assetsBasePath={assetsBasePath} html={html} iframeHeight={iframeHeight} iframeRef={iframeRef} isPanning={isPanning} onElementDeselected={onElementDeselected} onLoad={handleIframeLoad} panActive={panActive} pickerActive={pickerActive} rectSelectorActive={rectSelectorActive} scale={scale} scrollContainerRef={scrollContainerRef} selectedMpId={selectedMpId} selectedRect={selectedRect} selectedSelector={selectedSelector} selectionRect={selectionRect} viewportWidth={viewportWidth} />;
});
