import { Dialog } from "../../../components/ui/Dialog";
import { HEIGHT_MODE_OPTIONS } from "../constants";
import type { HeightMode } from "../types";

export function CaptureSettingsDialog({ open, heightMode, onClose, onSelect }: { open: boolean; heightMode: HeightMode; onClose: () => void; onSelect: (value: HeightMode) => void }) {
  return (
    <Dialog open={open} onClose={onClose} icon="settings_overscan" title="Capture Settings" cancelLabel="Close">
      <HeightModeSection heightMode={heightMode} onSelect={onSelect} />
    </Dialog>
  );
}

function HeightModeSection({ heightMode, onSelect }: { heightMode: HeightMode; onSelect: (value: HeightMode) => void }) {
  return (
    <section className="space-y-sm">
      <SectionTitle />
      <div className="gap-gutter flex flex-col">{HEIGHT_MODE_OPTIONS.map(option => <HeightModeOption key={option.value} heightMode={heightMode} onSelect={onSelect} option={option} />)}</div>
    </section>
  );
}

function SectionTitle() {
  return (
    <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
      <label className="font-label-caps text-label-caps text-on-surface-variant">Height Handling</label>
      <span className="group relative cursor-help">
        <span className="material-symbols-outlined text-outline text-[14px]">info</span>
        <span className="bg-surface-container-highest border-outline-variant px-sm py-xs text-on-surface-variant pointer-events-none absolute top-full right-0 z-10 mt-1 w-56 rounded border text-[11px] leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:opacity-100">How to handle JS-set pixel heights that track the viewport.</span>
      </span>
    </div>
  );
}

function HeightModeOption({ heightMode, onSelect, option }: { heightMode: HeightMode; onSelect: (value: HeightMode) => void; option: (typeof HEIGHT_MODE_OPTIONS)[number] }) {
  const isSelected = heightMode === option.value;
  const radioClassName = isSelected ? "border-primary-container bg-primary-container" : "border-outline-variant";
  return (
    <label className="p-sm bg-surface-container-lowest border-outline-variant group flex cursor-pointer items-center justify-between border">
      <div className="gap-sm flex items-center">
        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">{option.icon}</span>
        <div>
          <span className="text-ui-small text-on-surface">{option.label}{option.value === "convert-vh" && <span className="text-primary ml-1 text-[10px] font-bold uppercase">Recommended</span>}</span>
          <p className="text-on-surface-variant/70 mt-0.5 text-[11px]">{option.desc}</p>
        </div>
      </div>
      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${radioClassName}`} onClick={() => onSelect(option.value)}>{isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}</div>
      <input type="radio" name="heightMode" value={option.value} checked={isSelected} onChange={() => onSelect(option.value)} className="sr-only" />
    </label>
  );
}
