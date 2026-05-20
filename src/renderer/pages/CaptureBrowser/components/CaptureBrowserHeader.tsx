import type { MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";

export function CaptureBrowserHeader({ onMouseDown }: { onMouseDown: (event: ReactMouseEvent) => void }) {
  const navigate = useNavigate();
  return (
    <header onMouseDown={onMouseDown} className="z-50 flex h-12 w-full items-center justify-between border-b border-slate-700 bg-slate-900 pr-4 pl-20 [-webkit-app-region:drag]">
      <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
        <span onClick={() => navigate("/")} className="font-headline-md cursor-pointer text-lg font-bold tracking-tighter text-slate-50">MockPilot</span>
        <div className="h-4 w-px bg-slate-700" />
        <span className="font-ui-small text-slate-400">Capture Browser</span>
      </div>
      <button onClick={() => navigate("/")} className="font-ui-small gap-xs flex cursor-pointer items-center text-slate-400 transition-colors [-webkit-app-region:no-drag] hover:text-white">
        <span className="material-symbols-outlined text-[18px]">close</span>
        Cancel
      </button>
    </header>
  );
}
