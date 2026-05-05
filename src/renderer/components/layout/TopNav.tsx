export function TopNav() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 flex justify-between items-center px-4 h-12 w-full fixed top-0 z-50 text-sm tracking-tight">
      <div className="flex items-center gap-md">
        <span className="text-lg font-bold tracking-tighter text-slate-50">
          MockPilot
        </span>
      </div>
      <div className="flex items-center gap-md">
        <button className="flex items-center gap-xs px-3 py-1 bg-primary-container text-on-primary-container font-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all">
          <span>Deploy Changes</span>
        </button>
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-slate-400 hover:text-white cursor-pointer">
            notifications
          </span>
          <span className="material-symbols-outlined text-slate-400 hover:text-white cursor-pointer">
            account_circle
          </span>
        </div>
      </div>
    </header>
  );
}
