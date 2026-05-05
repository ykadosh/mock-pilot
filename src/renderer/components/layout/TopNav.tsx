import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface TopNavProps {
  children?: ReactNode;
}

export function TopNav({ children }: TopNavProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-700 flex justify-between items-center pl-20 pr-4 h-12 w-full fixed top-0 z-50 text-sm tracking-tight [-webkit-app-region:drag]">
      <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
        <span
          onClick={() => navigate("/")}
          className="text-lg font-bold tracking-tighter text-slate-50 cursor-pointer"
        >
          MockPilot
        </span>
      </div>
      <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
        {children}
        <div className="flex items-center gap-sm">
          <button className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">
            notifications
          </button>
          <button className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">
            account_circle
          </button>
        </div>
        <button className="bg-primary-container text-on-primary-container px-md py-1.5 font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all">
          Deploy Changes
        </button>
      </div>
    </header>
  );
}
