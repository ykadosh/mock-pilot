import type { EditorState } from "./Editor.hooks";
import type { DevicePreset } from "./Editor.utils";

const DEVICE_BUTTONS: Array<{ device: DevicePreset; icon: string }> = [
  { device: "desktop", icon: "desktop_windows" },
  { device: "tablet", icon: "tablet_mac" },
  { device: "phone", icon: "smartphone" },
];

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  const className = active
    ? "border-violet-400 bg-slate-800 text-violet-400"
    : "border-transparent text-slate-500 hover:text-slate-300";

  return (
    <button onClick={onClick} className={`flex cursor-pointer items-center self-stretch border-b-2 px-3 font-mono text-xs transition-colors ${className}`}>
      {label}
    </button>
  );
}

function DeviceButton({ active, device, icon, onClick }: { active: boolean; device: DevicePreset; icon: string; onClick: (device: DevicePreset) => void }) {
  const className = active ? "text-primary-container" : "text-slate-500 hover:text-slate-300";

  return (
    <button onClick={() => onClick(device)} className={`flex cursor-pointer items-center justify-center rounded p-1.5 px-2.5 ${className}`}>
      <span className="material-symbols-outlined text-2xl leading-none">{icon}</span>
    </button>
  );
}

function IconButton({ disabled = false, icon, onClick }: { disabled?: boolean; icon: string; onClick: () => void }) {
  const className = disabled ? "cursor-not-allowed text-slate-700" : "text-slate-500 hover:text-white";

  return (
    <button onClick={onClick} disabled={disabled} className={`cursor-pointer ${className}`}>
      <span className="material-symbols-outlined text-2xl">{icon}</span>
    </button>
  );
}

function CodeToolbar({ codeDirty, codeEditorRef, codeTab, setCodeTab }: Pick<EditorState, "codeDirty" | "codeEditorRef" | "codeTab" | "setCodeTab">) {
  return (
    <>
      <div className="flex items-center self-stretch">
        <TabButton active={codeTab === "html"} label="HTML" onClick={() => setCodeTab("html")} />
        <TabButton active={codeTab === "css"} label="CSS" onClick={() => setCodeTab("css")} />
      </div>
      <button onClick={() => codeEditorRef.current?.update()} className="relative cursor-pointer rounded bg-violet-600 px-3 py-1 font-mono text-xs text-white transition-colors hover:bg-violet-500">
        Save
        {codeDirty && <span className="bg-on-primary-container absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full" />}
      </button>
    </>
  );
}

function VisualToolbar(state: Pick<EditorState, "canRedo" | "canUndo" | "device" | "pointer" | "redo" | "setDevice" | "undo" | "viewportHeight" | "viewportWidth" | "zoom" | "zoomIn" | "zoomOut">) {
  const { canRedo, canUndo, device, redo, setDevice, undo, viewportHeight, viewportWidth, zoom, zoomIn, zoomOut } = state;

  return (
    <>
      <div className="left-md bg-background absolute top-0 bottom-[-5px] flex items-center rounded-b-lg border border-t-0 border-[#334155] px-1">
        {DEVICE_BUTTONS.map((item) => (
          <DeviceButton key={item.device} active={device === item.device} device={item.device} icon={item.icon} onClick={setDevice} />
        ))}
      </div>
      <span className="text-ui-small font-body-main mx-auto text-slate-400">{viewportWidth} x {viewportHeight} ({zoom}%)</span>
      <div className="gap-sm flex items-center">
        <IconButton icon="zoom_in" onClick={zoomIn} />
        <IconButton icon="zoom_out" onClick={zoomOut} />
        <div className="mx-2 h-4 w-px bg-slate-700" />
        <IconButton disabled={!canUndo} icon="undo" onClick={undo} />
        <IconButton disabled={!canRedo} icon="redo" onClick={redo} />
      </div>
    </>
  );
}

export function EditorToolbar({ state }: { state: EditorState }) {
  return (
    <div className="px-md bg-surface-container relative z-10 flex h-10 items-center justify-between border-b border-[#334155]">
      {state.codeEditorOpen ? <CodeToolbar {...state} /> : <VisualToolbar {...state} />}
    </div>
  );
}
