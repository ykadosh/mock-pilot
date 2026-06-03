import type { MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import logoText from "../../../../../resources/logo-text-64.png";

const isMac = navigator.userAgent.includes("Mac");

export function CaptureBrowserHeader({ onMouseDown }: { onMouseDown: (event: ReactMouseEvent) => void }) {
  const navigate = useNavigate();
  return (
    <header
      onMouseDown={onMouseDown}
      className={`z-50 flex h-12 w-full items-center justify-between border-b border-slate-700 bg-slate-900 pr-4 [-webkit-app-region:drag] ${
        isMac ? "pl-20" : "pl-4"
      }`}
    >
      <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
        <img
          src={logoText}
          alt="MockPilot"
          onClick={() => navigate("/")}
          className="h-6 w-[34px] cursor-pointer object-cover object-left min-[960px]:w-auto"
        />
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
