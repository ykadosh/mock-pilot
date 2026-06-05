import { useCallback, useEffect, useRef, useState } from "react";
import type { CropPreview, CropRegion } from "../types";
import { CropCanvas } from "./CropCaptureCanvas";
import { CropDialogFooter, CropDialogHeader, CropSidebar } from "./CropCaptureDialogPanels";

const MIN_CROP_HEIGHT = 100;
const MAX_EXTENSION_FACTOR = 5;
const EXTEND_DEBOUNCE_MS = 250;

interface CropCaptureDialogProps {
  preview: CropPreview;
  url: string;
  onConfirm: (region: CropRegion) => void;
  onCancel: () => void;
  onExtendPreview?: (targetHeight: number) => Promise<CropPreview>;
}

export function CropCaptureDialog({ preview, url, onConfirm, onCancel, onExtendPreview }: CropCaptureDialogProps) {
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
    const safe = Math.max(naturalPageHeight, Math.min(height, maxPageHeight));
    setPageHeightState(safe);
    const { top, height: h } = cropRef.current;
    if (top + h > safe) {
      const clamped = clampCropRegion(top, h, safe);
      setCropTop(clamped.top);
      setCropHeight(clamped.height);
    }
  }, [naturalPageHeight, maxPageHeight]);
  useEscapeToCancel(onCancel);
  useExtendedPreviewSync({ pageHeight, currentHeight: effectivePreview.naturalHeight, onExtendPreview, setEffectivePreview });
  return (
    <div className="p-md fixed inset-0 z-[100] flex items-center justify-center">
      <div onClick={onCancel} className="bg-background/60 absolute inset-0 backdrop-blur-[6px]" />
      <div className="bg-surface-container-low border-outline relative flex h-[640px] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        <CropDialogHeader onCancel={onCancel} />
        <div className="flex flex-1 overflow-hidden">
          <CropCanvas cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} preview={effectivePreview} setRegion={setRegion} setPageHeight={setPageHeight} />
          <CropSidebar cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} preview={effectivePreview} setRegion={setRegion} setPageHeight={setPageHeight} url={url} />
        </div>
        <CropDialogFooter cropTop={cropTop} cropHeight={cropHeight} pageHeight={pageHeight} onCancel={onCancel} onConfirm={onConfirm} />
      </div>
    </div>
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
    if (!onExtendPreview || pageHeight <= currentHeight || inFlightRef.current) return;
    const target = Math.ceil(pageHeight);
    const timer = setTimeout(() => {
      inFlightRef.current = true;
      onExtendPreview(target)
        .then(next => setEffectivePreview(prev => next.naturalHeight > prev.naturalHeight ? next : prev))
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

function useEscapeToCancel(onCancel: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);
}
