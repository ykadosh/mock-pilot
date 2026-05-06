import type { HistoryEntry } from "../hooks/useHistory";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  pointer: number;
  onGoTo: (index: number) => void;
  onClose: () => void;
}

export function HistoryPanel({ entries, pointer, onGoTo, onClose }: HistoryPanelProps) {
  return (
    <aside className="absolute left-16 top-0 bottom-0 w-64 bg-slate-900/95 backdrop-blur-md border-r border-[#334155] flex flex-col overflow-hidden shadow-2xl z-50">
      <div className="p-sm border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <span className="font-label-caps text-label-caps text-slate-300">
          HISTORY
        </span>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-slate-500 hover:text-white text-sm cursor-pointer"
        >
          close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-sm">
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
    </aside>
  );
}
