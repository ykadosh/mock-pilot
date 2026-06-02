import { Tooltip } from "../Tooltip";

interface ToolButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <Tooltip label={label} placement="right">
      <button
        onClick={onClick}
        className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-all ${
          active
            ? "bg-slate-700/50 text-violet-400"
            : "text-slate-400 hover:bg-slate-700/50 hover:text-white"
        }`}
      >
        <span className="material-symbols-outlined">{icon}</span>
      </button>
    </Tooltip>
  );
}

interface SideNavProps {
  activeTool?: string;
  onToolClick?: (tool: string) => void;
}

export function SideNav({ activeTool, onToolClick }: SideNavProps) {
  return (
    <div className="fixed top-1/2 left-4 z-[60] flex -translate-y-1/2 flex-col gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-2 shadow-2xl backdrop-blur-lg">
      <ToolButton icon="ads_click" label="Element Picker" active={activeTool === "Element Picker"} onClick={() => onToolClick?.("Element Picker")} />
      <ToolButton icon="select" label="Rectangle Selector" active={activeTool === "Rectangle Selector"} onClick={() => onToolClick?.("Rectangle Selector")} />
      <ToolButton icon="pan_tool" label="Pan Tool" active={activeTool === "Pan Tool"} onClick={() => onToolClick?.("Pan Tool")} />
      <ToolButton icon="history" label="History" active={activeTool === "History"} onClick={() => onToolClick?.("History")} />
      <ToolButton icon="layers" label="Layers" active={activeTool === "Layers"} onClick={() => onToolClick?.("Layers")} />
      <ToolButton icon="tune" label="Element Properties" active={activeTool === "Properties"} onClick={() => onToolClick?.("Properties")} />
      <ToolButton icon="chat_bubble" label="Conversation" active={activeTool === "Chat"} onClick={() => onToolClick?.("Chat")} />
    </div>
  );
}
