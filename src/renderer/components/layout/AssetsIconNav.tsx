interface IconNavItemProps {
  icon: string;
  label: string;
  active?: boolean;
}

function IconNavItem({ icon, label, active }: IconNavItemProps) {
  return (
    <button
      className={`relative flex items-center justify-center w-full h-12 group ${
        active
          ? "bg-slate-800 text-violet-400 border-l-2 border-violet-500"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      <span className="absolute left-16 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </button>
  );
}

export function AssetsIconNav() {
  return (
    <aside className="bg-slate-900 border-r border-[#334155] fixed left-0 top-12 bottom-0 z-40 flex flex-col items-center py-2 w-16 transition-all duration-150">
      <div className="mb-4 flex flex-col items-center">
        <span className="text-violet-500 font-black text-[10px]">MP</span>
      </div>

      <nav className="flex flex-col w-full gap-1">
        <IconNavItem icon="near_me" label="Picker" />
        <IconNavItem icon="layers" label="Assets" active />
        <IconNavItem icon="code" label="Editor" />
        <IconNavItem icon="output" label="Export" />
      </nav>

      <div className="mt-auto pb-4">
        <span
          className="font-inter text-[10px] uppercase tracking-widest font-semibold text-slate-600"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          V1.0.4
        </span>
      </div>
    </aside>
  );
}
