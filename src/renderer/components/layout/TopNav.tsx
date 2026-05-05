import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

type ActiveTab = "editor" | "assets" | "settings";

interface TopNavProps {
  activeTab?: ActiveTab;
  children?: ReactNode;
}

const tabs: { label: string; key: ActiveTab; to: string }[] = [
  { label: "Editor", key: "editor", to: "/editor" },
  { label: "Assets", key: "assets", to: "/assets" },
  { label: "Settings", key: "settings", to: "/settings" },
];

export function TopNav({ activeTab, children }: TopNavProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-slate-900 border-b border-slate-700 flex justify-between items-center px-4 h-12 w-full fixed top-0 z-50 text-sm tracking-tight">
      <div className="flex items-center gap-md">
        <span
          onClick={() => navigate("/")}
          className="text-lg font-bold tracking-tighter text-slate-50 cursor-pointer"
        >
          MockPilot
        </span>
        {activeTab && (
          <nav className="hidden md:flex gap-sm ml-xl items-center">
            {tabs.map((tab) => (
              <span
                key={tab.key}
                onClick={() => navigate(tab.to)}
                className={`cursor-pointer px-2 py-1 transition-colors ${
                  tab.key === activeTab
                    ? "text-white bg-slate-800 rounded-sm"
                    : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                {tab.label}
              </span>
            ))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-md">
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
