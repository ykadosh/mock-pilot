import type { SelectedElement } from "../pages/Editor";

interface PropertiesPanelDetailsProps {
  element: SelectedElement;
  selector: string;
}

const layoutFields = [
  ["Width", "width", "auto"],
  ["Height", "height", "auto"],
  ["Padding", "padding", "0"],
  ["Margin", "margin", "0"],
] as const;

const appearanceFields = [
  ["Background", "background-color", "transparent"],
  ["Color", "color", "inherit"],
  ["Font Size", "font-size", "inherit"],
  ["Border Radius", "border-radius", "0"],
  ["Display", "display", "block"],
  ["Position", "position", "static"],
] as const;

export function PropertiesPanelDetails({ element, selector }: PropertiesPanelDetailsProps) {
  return (
    <>
      <div className="p-sm border-b border-slate-800 bg-violet-900/20">
        <div className="gap-sm flex items-center">
          <span className="material-symbols-outlined text-sm text-violet-400">ads_click</span>
          <span className="flex-1 truncate font-mono text-[11px] text-violet-300">{selector}</span>
        </div>
      </div>
      <div className="p-md border-b border-slate-800">
        <span className="font-label-caps text-label-caps mb-md block text-slate-500">LAYOUT</span>
        <div className="gap-sm grid grid-cols-2">
          {layoutFields.map(([label, key, fallback]) => (
            <div key={label} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
              <input className="w-full rounded border border-[#334155] bg-[#020617] px-2 py-1 font-mono text-xs text-slate-300" type="text" value={element.computedStyle[key] || fallback} readOnly />
            </div>
          ))}
        </div>
      </div>
      <div className="p-md border-b border-slate-800">
        <span className="font-label-caps text-label-caps mb-md block text-slate-500">APPEARANCE</span>
        <div className="space-y-md">
          {appearanceFields.map(([label, key, fallback]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{label}</span>
              <span className="font-mono text-[10px] text-slate-500">{element.computedStyle[key] || fallback}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
