import { useMemo, useRef } from "react";
import { SectionCard } from "../../components/ui/SectionCard";
import { ExportButton } from "./ExportButton";
import { DEVICE_SIZES, type DevicePreset } from "./Export.utils";

interface ExportImageSectionProps {
  customHeight: number;
  customWidth: number;
  device: DevicePreset;
  imageExporting: boolean;
  imageResult: string | null;
  previewHtml: string;
  setCustomHeight: (value: number) => void;
  setCustomWidth: (value: number) => void;
  setDevice: (value: DevicePreset) => void;
  showPreview: boolean;
  onExportImage: () => void;
  onShowPreview: () => void;
}

export function ExportImageSection(props: ExportImageSectionProps) {
  const controls = <ImageControls {...props} />;
  const preview = <PreviewPane {...props} />;

  return (
    <SectionCard title="IMAGE RENDER" className="lg:col-span-8">
      <div className="gap-lg grid h-[calc(100%-2rem)] grid-cols-1 md:grid-cols-2">
        {controls}
        {preview}
      </div>
    </SectionCard>
  );
}

function ImageControls(props: ExportImageSectionProps) {
  const { customHeight, customWidth, device, imageExporting, imageResult, setCustomHeight, setCustomWidth, setDevice, onExportImage } = props;

  return (
    <div className="space-y-lg">
      <DevicePresetSelector device={device} setDevice={setDevice} />
      <DimensionInputs customHeight={customHeight} customWidth={customWidth} setCustomHeight={setCustomHeight} setCustomWidth={setCustomWidth} />
      <ExportButton onClick={onExportImage} disabled={imageExporting} icon="photo_camera" className="w-full">
        {imageExporting ? "Rendering…" : "Export as PNG"}
      </ExportButton>
      {imageResult && <p className="text-outline truncate text-center text-[10px]">{imageResult}</p>}
    </div>
  );
}

function DevicePresetSelector({ device, setDevice }: Pick<ExportImageSectionProps, "device" | "setDevice">) {
  return (
    <div>
      <span className="text-ui-small text-outline mb-sm block uppercase">DEVICE PRESETS</span>
      <div className="gap-xs grid grid-cols-3">
        {(Object.entries(DEVICE_SIZES) as [DevicePreset, (typeof DEVICE_SIZES)[DevicePreset]][]).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDevice(key)}
            className={`flex cursor-pointer flex-col items-center justify-center border py-4 transition-all ${device === key ? "bg-primary-container/10 text-primary border-[#7C3AED]" : "hover:border-outline text-outline border-[#334155]"}`}
          >
            <span className="material-symbols-outlined mb-1">{preset.icon}</span>
            <span className="text-[10px] font-bold">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DimensionInputs(props: Pick<ExportImageSectionProps, "customHeight" | "customWidth" | "setCustomHeight" | "setCustomWidth">) {
  return (
    <div>
      <span className="text-ui-small text-outline mb-sm block uppercase">CUSTOM DIMENSIONS</span>
      <div className="gap-sm flex">
        <DimensionInput label="Width (px)" value={props.customWidth} onChange={props.setCustomWidth} />
        <DimensionInput label="Height (px)" value={props.customHeight} onChange={props.setCustomHeight} />
      </div>
    </div>
  );
}

function DimensionInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex-1">
      <label className="text-outline mb-1 block text-[10px] uppercase">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="bg-surface-container-lowest text-ui-small focus:ring-primary text-on-surface w-full border border-[#334155] p-2 focus:ring-1 focus:outline-none"
      />
    </div>
  );
}

function PreviewPane(props: Pick<ExportImageSectionProps, "customHeight" | "customWidth" | "onShowPreview" | "previewHtml" | "showPreview">) {
  const { customHeight, customWidth, onShowPreview, previewHtml, showPreview } = props;
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const containerSize = {
    width: previewContainerRef.current?.offsetWidth,
    height: previewContainerRef.current?.offsetHeight,
  };
  const scale = usePreviewScale(customWidth, customHeight, containerSize);

  return (
    <div
      ref={previewContainerRef}
      className="group bg-surface-container-lowest mt-lg relative flex min-h-[200px] cursor-pointer items-start justify-center overflow-hidden border border-[#334155]"
      onClick={() => previewHtml && onShowPreview()}
    >
      {showPreview && previewHtml ? <PreviewFrame customHeight={customHeight} customWidth={customWidth} previewHtml={previewHtml} scale={scale} /> : <PreviewPlaceholder />}
    </div>
  );
}

function PreviewFrame({ customHeight, customWidth, previewHtml, scale }: { customHeight: number; customWidth: number; previewHtml: string; scale: number }) {
  return (
    <iframe
      srcDoc={previewHtml}
      className="pointer-events-none absolute border-0"
      sandbox="allow-same-origin"
      style={{ width: `${customWidth}px`, height: `${customHeight}px`, transform: `scale(${scale})`, transformOrigin: "top center" }}
    />
  );
}

function PreviewPlaceholder() {
  return (
    <>
      <div className="from-surface-container-lowest to-surface-container absolute inset-0 bg-gradient-to-br opacity-60" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="border-outline/20 flex items-center gap-2 border bg-[#0F172A]/80 px-3 py-1.5 backdrop-blur-sm">
          <span className="material-symbols-outlined text-primary text-[16px]">zoom_in</span>
          <span className="text-on-surface text-[10px] font-bold tracking-widest uppercase">Preview Render</span>
        </div>
      </div>
    </>
  );
}

function usePreviewScale(width: number, height: number, containerSize: { width?: number; height?: number }) {
  return useMemo(() => Math.max((containerSize.width ?? 300) / width, (containerSize.height ?? 200) / height), [containerSize.height, containerSize.width, height, width]);
}
