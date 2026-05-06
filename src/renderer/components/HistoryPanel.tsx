import type { HistoryEntry } from "../hooks/useHistory";
import { SidePanel } from "./ui/SidePanel";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  pointer: number;
  onGoTo: (index: number) => void;
  onClose: () => void;
}

export function HistoryPanel({ entries, pointer, onGoTo, onClose }: HistoryPanelProps) {
  return (
    <SidePanel title="HISTORY" onClose={onClose}>
      <div className="p-sm">
        {entries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center mt-4">No history yet</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {[...entries].reverse().map((entry, reverseIdx) => {
              const idx = entries.length - 1 - reverseIdx;
              const isActive = idx === pointer;
              return (
                <button
                  key={idx}
                  onClick={() => onGoTo(idx)}
                  className={`text-left px-sm py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[14px]">
                      {idx === 0 ? "flag" : "edit"}
                    </span>
                    <span className="truncate flex-1">{entry.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 ml-5">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
