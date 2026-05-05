import { useState } from "react";

interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  collapsed: boolean;
}

function NavItem({ icon, label, active, collapsed }: NavItemProps) {
  return (
    <button
      className={`relative flex items-center w-full h-12 group cursor-pointer transition-all ${
        collapsed ? "justify-center" : "gap-sm px-md"
      } ${
        active
          ? "bg-slate-800 text-violet-400 border-l-2 border-violet-500"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {collapsed ? (
        <span className="absolute left-full ml-2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
          {label}
        </span>
      ) : (
        <span className="text-xs uppercase font-semibold tracking-wider">
          {label}
        </span>
      )}
    </button>
  );
}

interface SideNavProps {
  defaultCollapsed?: boolean;
}

export function SideNav({ defaultCollapsed = false }: SideNavProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-700 flex flex-col sticky top-0 h-[calc(100vh-3rem)] z-40 transition-all duration-150 ease-in-out shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Collapse/Expand toggle */}
      <div className="flex items-center border-b border-slate-700 p-sm">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer mx-auto"
        >
          <span className="material-symbols-outlined text-lg">
            {collapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
        {!collapsed && (
          <div className="ml-sm flex-1 min-w-0">
            <h2 className="text-xs font-mono text-slate-400 uppercase tracking-widest truncate">
              Project Alpha
            </h2>
            <p className="text-[10px] text-slate-500">v1.0.4-stable</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-sm flex flex-col gap-1">
        <NavItem icon="ads_click" label="Element Picker" collapsed={collapsed} />
        <NavItem icon="layers" label="Layers" collapsed={collapsed} />
        <NavItem icon="code" label="Code Editor" collapsed={collapsed} />
        <NavItem icon="ios_share" label="Export" collapsed={collapsed} />
      </nav>

      <div className="border-t border-slate-700 p-sm flex flex-col gap-1">
        <NavItem icon="help" label="Docs" collapsed={collapsed} />
        <NavItem icon="contact_support" label="Support" collapsed={collapsed} />
      </div>
    </aside>
  );
}


