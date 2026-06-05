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
  const [effectivePreview, setEffectivePreview] = useState(preview);
  const [cropTop, setCropTop] = useState(0);
  const [cropHeight, setCropHeight] = useState(preview.naturalHeight);
  const maxBottom = preview.naturalHeight * MAX_EXTENSION_FACTOR;
  const clamp = useCallback((top: number, height: number) => clampCropRegion(top, height, maxBottom), [maxBottom]);
  const setRegion = useCallback((top: number, height: number) => {
    const next = clamp(top, height);
    setCropTop(next.top);
    setCropHeight(next.height);
  }, [clamp]);
  useEscapeToCancel(onCancel);
  useExtendedPreviewSync({ cropBottom: cropTop + cropHeight, currentHeight: effectivePreview.naturalHeight, onExtendPreview, setEffectivePreview });
  return (
    <div className="p-md fixed inset-0 z-[100] flex items-center justify-center">
      <div onClick={onCancel} className="bg-background/60 absolute inset-0 backdrop-blur-[6px]" />
      <div className="bg-surface-container-low border-outline relative flex h-[640px] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl">
        <CropDialogHeader onCancel={onCancel} />
        <div className="flex flex-1 overflow-hidden">
          <CropCanvas cropTop={cropTop} cropHeight={cropHeight} preview={effectivePreview} naturalPageHeight={preview.naturalHeight} setRegion={setRegion} />
          <CropSidebar cropTop={cropTop} cropHeight={cropHeight} preview={effectivePreview} setRegion={setRegion} url={url} />
        </div>
        <CropDialogFooter cropTop={cropTop} cropHeight={cropHeight} onCancel={onCancel} onConfirm={onConfirm} />
      </div>
    </div>
  );
}

interface ExtendSyncArgs {
  cropBottom: number;
  currentHeight: number;
  onExtendPreview?: (targetHeight: number) => Promise<CropPreview>;
  setEffectivePreview: (updater: (prev: CropPreview) => CropPreview) => void;
}

function useExtendedPreviewSync({ cropBottom, currentHeight, onExtendPreview, setEffectivePreview }: ExtendSyncArgs) {
  const inFlightRef = useRef(false);
  useEffect(() => {
    if (!onExtendPreview || cropBottom <= currentHeight || inFlightRef.current) return;
    const target = Math.ceil(cropBottom);
    const timer = setTimeout(() => {
      inFlightRef.current = true;
      onExtendPreview(target)
        .then(next => setEffectivePreview(prev => next.naturalHeight > prev.naturalHeight ? next : prev))
        .finally(() => { inFlightRef.current = false; });
    }, EXTEND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [cropBottom, currentHeight, onExtendPreview, setEffectivePreview]);
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
