import { useNavigate } from "react-router-dom";

interface TabProps {
  label: string;
  active?: boolean;
  to?: string;
}

function Tab({ label, active, to }: TabProps) {
  const navigate = useNavigate();
  return (
    <span
      onClick={() => to && navigate(to)}
      className={`cursor-pointer px-2 ${
        active
          ? "text-violet-400 border-b-2 border-violet-500 pb-2"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors py-1"
      }`}
    >
      {label}
    </span>
  );
}

export function AssetsTopNav() {
  return (
    <header className="bg-slate-900 border-b border-[#334155] flex justify-between items-center h-12 px-4 w-full fixed top-0 z-50 text-sm tracking-tight">
      <div className="flex items-center gap-6">
        <span className="text-lg font-bold text-slate-50 tracking-tighter">
          MockPilot
        </span>
        <nav className="hidden md:flex gap-4 items-center h-full">
          <Tab label="Editor" to="/editor" />
          <Tab label="Assets" active />
          <Tab label="Settings" />
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-surface-container-lowest border border-outline-variant px-2 py-1 flex items-center gap-2 rounded">
          <span className="material-symbols-outlined text-outline text-[16px]">
            search
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-ui-small w-48 text-on-surface"
            placeholder="Search Components..."
            type="text"
          />
        </div>
        <button className="material-symbols-outlined text-slate-400 hover:text-slate-200">
          notifications
        </button>
        <button className="material-symbols-outlined text-slate-400 hover:text-slate-200">
          account_circle
        </button>
      </div>
    </header>
  );
}
