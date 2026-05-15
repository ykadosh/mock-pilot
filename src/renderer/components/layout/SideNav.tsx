interface ToolButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
          active
            ? "text-violet-400 bg-slate-700/50"
            : "text-slate-400 hover:text-white hover:bg-slate-700/50"
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </button>
      <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none border border-slate-700 shadow-lg z-50">
        {label}
      </div>
    </div>
  );
}

interface SideNavProps {
  activeTool?: string;
  onToolClick?: (tool: string) => void;
}

export function SideNav({ activeTool, onToolClick }: SideNavProps) {
  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-2 p-2 rounded-xl border border-slate-700/50 shadow-2xl"
      style={{ backdropFilter: "blur(12px)", background: "rgba(15, 23, 42, 0.7)" }}
    >
      <ToolButton icon="ads_click" label="Element Picker" active={activeTool === "Element Picker"} onClick={() => onToolClick?.("Element Picker")} />
      <ToolButton icon="select" label="Rectangle Selector" active={activeTool === "Rectangle Selector"} onClick={() => onToolClick?.("Rectangle Selector")} />
      <ToolButton icon="pan_tool" label="Pan Tool" active={activeTool === "Pan Tool"} onClick={() => onToolClick?.("Pan Tool")} />
      <ToolButton icon="history" label="History" active={activeTool === "History"} onClick={() => onToolClick?.("History")} />
      <ToolButton icon="layers" label="Layers" active={activeTool === "Layers"} onClick={() => onToolClick?.("Layers")} />
    </div>
  );
}
