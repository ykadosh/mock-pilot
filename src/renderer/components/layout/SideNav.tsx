interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
}

function NavItem({ icon, label, active }: NavItemProps) {
  return (
    <div
      className={`flex items-center gap-sm px-md py-xs font-inter text-xs uppercase font-semibold tracking-wider cursor-pointer transition-all ${
        active
          ? "bg-slate-800 text-violet-400 border-l-2 border-[#7C3AED]"
          : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
      }`}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </div>
  );
}

export function SideNav() {
  return (
    <aside className="bg-slate-900 border-r border-slate-700 fixed left-0 top-12 bottom-0 w-64 flex flex-col z-40 transition-all duration-150 ease-in-out">
      <div className="p-md border-b border-slate-700">
        <div className="text-xs font-mono text-slate-400">Project Alpha</div>
        <div className="text-[10px] text-slate-500 mt-xs">v1.0.4-stable</div>
      </div>

      <nav className="flex-grow py-md">
        <div className="px-md mb-sm">
          <button className="w-full bg-primary text-on-primary py-sm rounded text-ui-small font-bold flex items-center justify-center gap-xs hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-sm">add</span>
            New Layer
          </button>
        </div>

        <div className="flex flex-col">
          <NavItem icon="ads_click" label="Element Picker" active />
          <NavItem icon="edit_note" label="Modifications" />
          <NavItem icon="layers" label="Layers" />
          <NavItem icon="code" label="Code Editor" />
          <NavItem icon="ios_share" label="Export" />
        </div>
      </nav>

      <footer className="mt-auto border-t border-slate-700 p-sm">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-sm px-sm py-1 text-slate-500 hover:text-slate-300 text-xs cursor-pointer transition-all">
            <span className="material-symbols-outlined text-xs">help</span>
            Docs
          </div>
          <div className="flex items-center gap-sm px-sm py-1 text-slate-500 hover:text-slate-300 text-xs cursor-pointer transition-all">
            <span className="material-symbols-outlined text-xs">
              contact_support
            </span>
            Support
          </div>
        </div>
      </footer>
    </aside>
  );
}
