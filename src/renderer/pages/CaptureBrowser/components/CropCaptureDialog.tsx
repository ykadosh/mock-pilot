import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "../../../components/ui/Dialog";
import type { CropPreview, CropRegion } from "../types";
import { CropCanvas } from "./CropCaptureCanvas";
import { CropDialogFooter, CropSidebar } from "./CropCaptureDialogPanels";

const MIN_CROP_HEIGHT = 100;
const MAX_EXTENSION_FACTOR = 5;
const EXTEND_DEBOUNCE_MS = 250;

interface CropCaptureDialogProps {
  preview: CropPreview;
  onConfirm: (region: CropRegion) => void;
  onCancel: () => void;
  onExtendPreview?: (targetHeight: number) => Promise<CropPreview>;
}

export function CropCaptureDialog({ preview, onConfirm, onCancel, onExtendPreview }: CropCaptureDialogProps) {
  const naturalPageHeight = preview.naturalHeight;
  const maxPageHeight = naturalPageHeight * MAX_EXTENSION_FACTOR;
  const [effectivePreview, setEffectivePreview] = useState(preview);
  const [pageHeight, setPageHeightState] = useState(naturalPageHeight);
  const [cropTop, setCropTop] = useState(0);
  const [cropHeight, setCropHeight] = useState(naturalPageHeight);
  const cropRef = useRef({ top: cropTop, height: cropHeight });
  cropRef.current = { top: cropTop, height: cropHeight };
  const setRegion = useCallback((top: number, height: number) => {
    const next = clampCropRegion(top, height, pageHeight);
    setCropTop(next.top);
    setCropHeight(next.height);
  }, [pageHeight]);
  const setPageHeight = useCallback((height: number) => {
    const safe = Math.round(Math.max(naturalPageHeight, Math.min(height, maxPageHeight)));
    setPageHeightState(safe);
    const { top, height: h } = cropRef.current;
    if (top + h > safe) {
      const clamped = clampCropRegion(top, h, safe);
      setCropTop(clamped.top);
      setCropHeight(clamped.height);
    }
  }, [naturalPageHeight, maxPageHeight]);
  useExtendedPreviewSync({ pageHeight, currentHeight: effectivePreview.naturalHeight, onExtendPreview, setEffectivePreview });
  const footer = <CropDialogFooter cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} onCancel={onCancel} onConfirm={onConfirm} />;
  return (
    <Dialog open onClose={onCancel} icon="crop" iconFilled title="Crop Capture Area" panelClassName="h-[640px] w-full max-w-4xl" contentClassName="flex flex-1 overflow-hidden" footer={footer}>
      <CropCanvas cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} preview={effectivePreview} setRegion={setRegion} setPageHeight={setPageHeight} />
      <CropSidebar cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} setRegion={setRegion} setPageHeight={setPageHeight} />
    </Dialog>
  );
}

interface ExtendSyncArgs {
  pageHeight: number;
  currentHeight: number;
  onExtendPreview?: (targetHeight: number) => Promise<CropPreview>;
  setEffectivePreview: (updater: (prev: CropPreview) => CropPreview) => void;
}

function useExtendedPreviewSync({ pageHeight, currentHeight, onExtendPreview, setEffectivePreview }: ExtendSyncArgs) {
  const inFlightRef = useRef(false);
  useEffect(() => {
    if (!onExtendPreview || pageHeight === currentHeight || inFlightRef.current) return;
    const target = Math.ceil(pageHeight);
    const timer = setTimeout(() => {
      inFlightRef.current = true;
      onExtendPreview(target)
        .then(next => setEffectivePreview(prev => {
          if (next.dataUrl === prev.dataUrl) return prev;
          if (prev.dataUrl.startsWith("blob:")) URL.revokeObjectURL(prev.dataUrl);
          return next;
        }))
        .finally(() => { inFlightRef.current = false; });
    }, EXTEND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pageHeight, currentHeight, onExtendPreview, setEffectivePreview]);
}

function clampCropRegion(top: number, height: number, maxBottom: number) {
  const safeTop = Math.max(0, Math.min(top, maxBottom - MIN_CROP_HEIGHT));
  const safeHeight = Math.max(MIN_CROP_HEIGHT, Math.min(height, maxBottom - safeTop));
  return { top: safeTop, height: safeHeight };
}
