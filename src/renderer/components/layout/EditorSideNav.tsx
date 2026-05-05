interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
}

function NavItem({ icon, label, active }: NavItemProps) {
  return (
    <div
      className={`flex items-center gap-sm px-md py-2 font-inter text-xs uppercase font-semibold tracking-wider cursor-pointer transition-all ${
        active
          ? "bg-slate-800 text-violet-400 border-l-2 border-[#7C3AED]"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

export function EditorSideNav() {
  return (
    <aside className="bg-slate-900 border-r border-slate-700 w-64 flex flex-col fixed left-0 top-12 bottom-0 z-40 transition-all duration-150 ease-in-out">
      <div className="p-md border-b border-slate-700">
        <h2 className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          Project Alpha
        </h2>
        <p className="text-[10px] text-slate-500">v1.0.4-stable</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-sm">
        <NavItem icon="ads_click" label="Element Picker" />
        <NavItem icon="layers" label="Layers" />
        <NavItem icon="code" label="Code Editor" />
        <NavItem icon="ios_share" label="Export" />
      </nav>

      <div className="border-t border-slate-700 p-sm">
        <div className="flex items-center gap-sm px-md py-1.5 text-slate-500 hover:text-slate-200 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">help</span>
          <span className="text-xs uppercase font-semibold tracking-wider">
            Docs
          </span>
        </div>
        <div className="flex items-center gap-sm px-md py-1.5 text-slate-500 hover:text-slate-200 cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">
            contact_support
          </span>
          <span className="text-xs uppercase font-semibold tracking-wider">
            Support
          </span>
        </div>
      </div>
    </aside>
  );
}
