export function EditorTopNav() {
  return (
    <header className="bg-slate-900 border-b border-slate-700 flex justify-between items-center px-4 h-12 w-full fixed top-0 z-50">
      <div className="flex items-center gap-md">
        <span className="text-lg font-bold tracking-tighter text-slate-50 font-inter">
          MockPilot
        </span>
        <div className="hidden md:flex gap-sm ml-xl">
          <span className="font-inter text-sm tracking-tight text-white bg-slate-800 cursor-pointer transition-colors px-2 py-1 rounded-sm">
            Editor
          </span>
          <span className="font-inter text-sm tracking-tight text-slate-500 cursor-pointer hover:bg-slate-800 transition-colors px-2 py-1">
            Assets
          </span>
          <span className="font-inter text-sm tracking-tight text-slate-500 cursor-pointer hover:bg-slate-800 transition-colors px-2 py-1">
            Settings
          </span>
        </div>
      </div>
      <div className="flex items-center gap-md">
        <div className="flex gap-sm mr-md">
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
