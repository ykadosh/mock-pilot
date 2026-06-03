import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "../ui/Tooltip";

type ActiveTab = "editor" | "assets" | "settings" | "export" | "code-editor";

interface TopNavTabsProps {
  activeTab: ActiveTab;
  projectId?: string;
}

const pageTabs: { label: string; key: ActiveTab; to: string; icon: string }[] = [
  { label: "Editor", key: "editor", to: "/editor", icon: "edit" },
  { label: "Assets", key: "assets", to: "/assets", icon: "widgets" },
  { label: "Code Editor", key: "code-editor", to: "/code-editor", icon: "code" },
  { label: "Export", key: "export", to: "/export", icon: "ios_share" },
  { label: "Settings", key: "settings", to: "/settings", icon: "settings" },
];

function getTabRoute(tab: (typeof pageTabs)[number], projectId?: string) {
  return projectId ? `${tab.to}/${projectId}` : tab.to;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function TopNavTabs({ activeTab, projectId }: TopNavTabsProps) {
  const navigate = useNavigate();
  const labelsVisible = useMediaQuery("(min-width: 960px)");

  return (
    <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 [-webkit-app-region:no-drag]">
      {pageTabs.map((tab) => (
        <Tooltip key={tab.key} label={tab.label} placement="bottom" disabled={labelsVisible}>
          <button
            onClick={() => navigate(getTabRoute(tab, projectId))}
            className={`flex cursor-pointer items-center gap-1 rounded px-2.5 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition-colors ${
              tab.key === activeTab
                ? "bg-slate-800 text-violet-400"
                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            <span className="material-symbols-outlined leading-none" style={{ fontSize: 18 }}>{tab.icon}</span>
            <span className="hidden translate-y-px min-[960px]:inline">{tab.label}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
