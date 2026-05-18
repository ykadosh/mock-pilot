import type { AssetSection } from "../../pages/Assets";

const sidebarItems: { key: AssetSection; label: string; icon: string }[] = [
  { key: "fonts", label: "Typography", icon: "text_fields" },
  { key: "components", label: "Components", icon: "widgets" },
  { key: "icons", label: "Icons", icon: "category" },
  { key: "graphics", label: "Graphics", icon: "image" },
  { key: "palette", label: "Palette", icon: "palette" },
];

interface AssetsSidebarProps {
  activeSection: AssetSection;
  onSectionChange: (section: AssetSection) => void;
}

export function AssetsSidebar({ activeSection, onSectionChange }: AssetsSidebarProps) {
  return (
    <aside className="flex flex-col h-full w-[220px] border-r border-outline-variant bg-surface-container-low shrink-0">
      <div className="px-md pt-md pb-sm">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
          Resources
        </span>
      </div>
      <nav className="flex-1 flex flex-col gap-px py-xs">
        {sidebarItems.map((item) => {
          const isActive = item.key === activeSection;
          return (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`flex items-center gap-md px-md py-sm text-left transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-primary-container text-on-primary-container border-l-2 border-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high border-l-2 border-transparent"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-ui-small font-ui-small">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
