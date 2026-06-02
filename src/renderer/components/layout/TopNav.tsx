import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { TopNavAuth } from "./TopNavAuth";
import { TopNavTabs } from "./TopNavTabs";
import logoText from "../../../../resources/logo-text-64.png";

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
        <img
          src={logoText}
          alt="MockPilot"
          onClick={() => navigate("/")}
          className="h-6 w-auto cursor-pointer"
        />
      </div>
      {activeTab && <TopNavTabs activeTab={activeTab} projectId={projectId} />}
      <div className="gap-md ml-auto flex items-center [-webkit-app-region:no-drag]">
        {children}
        <button
          onClick={() => navigate("/app-settings")}
          className="cursor-pointer text-slate-400 transition-colors hover:text-white"
        >
          <span className="material-symbols-outlined text-2xl">settings</span>
        </button>
        <TopNavAuth />
      </div>
    </header>
  );
}
