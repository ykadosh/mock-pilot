interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function SidePanel({ title, onClose, children }: SidePanelProps) {
  return (
    <aside className="absolute right-4 top-14 bottom-4 w-72 bg-slate-900/90 backdrop-blur-md border border-[#334155] rounded-lg flex flex-col overflow-hidden shadow-2xl z-50">
      <div className="p-sm border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-lg">
        <span className="font-label-caps text-label-caps text-slate-300">
          {title}
        </span>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-sm text-slate-500 hover:text-slate-200 cursor-pointer"
        >
          close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
