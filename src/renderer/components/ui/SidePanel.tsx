interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function SidePanel({ title, onClose, children }: SidePanelProps) {
  return (
    <aside className="absolute top-14 right-4 bottom-4 z-50 flex w-72 flex-col overflow-hidden rounded-lg border border-[#334155] bg-slate-900/90 shadow-2xl backdrop-blur-md">
      <div className="p-sm flex items-center justify-between rounded-t-lg border-b border-slate-700 bg-slate-800">
        <span className="font-label-caps text-label-caps text-slate-300">
          {title}
        </span>
        <button
          onClick={onClose}
          className="material-symbols-outlined cursor-pointer text-sm text-slate-500 hover:text-slate-200"
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
