import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { TopNavAuth } from "./TopNavAuth";
import { TopNavTabs } from "./TopNavTabs";

type ActiveTab = "editor" | "assets" | "settings" | "export" | "code-editor";

interface TopNavProps {
  children?: ReactNode;
  activeTab?: ActiveTab;
  projectId?: string;
}

export function TopNav({ children, activeTab, projectId }: TopNavProps) {
  const navigate = useNavigate();

  return (
    <header className="relative z-50 flex h-12 w-full shrink-0 items-center border-b border-slate-700 bg-slate-900 pr-4 pl-20 text-sm tracking-tight [-webkit-app-region:drag]">
      <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
        <span
          onClick={() => navigate("/")}
          className="cursor-pointer text-lg font-bold tracking-tighter text-slate-50"
        >
          MockPilot
        </span>
      </div>
      {activeTab && <TopNavTabs activeTab={activeTab} projectId={projectId} />}
      <div className="gap-md ml-auto flex items-center [-webkit-app-region:no-drag]">
        {children}
        <button
          onClick={() => navigate("/app-settings")}
          className="material-symbols-outlined cursor-pointer text-slate-400 transition-colors hover:text-white"
        >
          settings
        </button>
        <TopNavAuth />
      </div>
    </header>
  );
}
