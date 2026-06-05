import { useEffect, useState } from "react";
import type { CropRegion } from "../types";

export function CropDialogHeader({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="h-xl px-md border-outline-variant bg-surface-container flex items-center justify-between border-b">
      <div className="gap-sm flex items-center">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>crop</span>
        <h2 className="font-headline-md text-headline-md text-on-surface">Crop Capture Area</h2>
      </div>
      <button onClick={onCancel} className="p-xs hover:bg-surface-bright text-on-surface-variant rounded transition-colors">
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
}

interface CropSidebarProps {
  cropTop: number;
  cropHeight: number;
  pageHeight: number;
  setRegion: (top: number, height: number) => void;
  setPageHeight: (height: number) => void;
}

export function CropSidebar({ cropTop, cropHeight, pageHeight, setRegion, setPageHeight }: CropSidebarProps) {
  const cropBottom = cropTop + cropHeight;
  return (
    <div className="bg-surface-container border-outline-variant p-md gap-lg flex w-[280px] flex-col border-l">
      <div className="space-y-md">
        <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant">PRECISION CONTROL</h3>
          <span className="material-symbols-outlined text-on-surface-variant text-[16px]">tune</span>
        </div>
        <CropNumberInput label="Top Crop" value={Math.round(cropTop)} onChange={(value) => setRegion(value, cropBottom - value)} />
        <CropNumberInput label="Bottom Crop" value={Math.round(cropBottom)} onChange={(value) => setRegion(cropTop, value - cropTop)} />
        <CropNumberInput label="Page Height" value={Math.round(pageHeight)} onChange={setPageHeight} />
      </div>
      <div className="flex flex-1 flex-col justify-end">
        <CropHint />
      </div>
    </div>
  );
}

function CropNumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isFinite(parsed)) onChange(parsed);
    else setDraft(String(value));
  };
  return (
    <div className="space-y-sm">
      <label className="font-ui-small text-ui-small text-on-surface">{label}</label>
      <div className="bg-surface-container-lowest border-outline-variant focus-within:border-primary focus-within:ring-primary relative flex items-center overflow-hidden rounded-lg border focus-within:ring-1">
        <input
          type="number"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}
          className="font-code-block text-primary px-md w-full min-w-0 border-none bg-transparent py-3 pr-10 text-lg outline-none focus:ring-0"
        />
        <span className="font-ui-small text-ui-small text-on-surface-variant/60 right-md pointer-events-none absolute">PX</span>
      </div>
    </div>
  );
}

function CropHint() {
  return (
    <div className="p-md bg-primary/10 border-primary/20 gap-sm flex items-start rounded-lg border">
      <span className="material-symbols-outlined text-primary text-[16px]">info</span>
      <p className="text-ui-small text-primary leading-tight">Drag the top and bottom handles to crop, or the lower handle to change the page height. You can also enter exact pixel values on the right.</p>
    </div>
  );
}

export function CropDialogFooter({ cropTop, cropHeight, pageHeight, onCancel, onConfirm }: { cropTop: number; cropHeight: number; pageHeight: number; onCancel: () => void; onConfirm: (region: CropRegion) => void }) {
  return (
    <div className="h-xl px-md gap-md border-outline-variant bg-surface-container flex items-center justify-end border-t">
      <button onClick={onCancel} className="px-md text-ui-small font-ui-small border-outline text-on-surface hover:bg-surface-bright h-[36px] rounded border transition-colors">Cancel</button>
      <button onClick={() => onConfirm({ top: Math.round(cropTop), height: Math.round(cropHeight), pageHeight: Math.round(pageHeight) })} className="px-md text-ui-small font-ui-small bg-primary text-on-primary hover:bg-primary/90 gap-xs flex h-[36px] items-center rounded font-bold transition-colors">
        Confirm Crop
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
      </button>
    </div>
  );
}
