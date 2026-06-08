import type { AssetSection } from "../../pages/Assets";

const sidebarItems: { key: AssetSection; label: string; icon: string }[] = [
  { key: "components", label: "Components", icon: "widgets" },
  { key: "fonts", label: "Typography", icon: "text_fields" },
  { key: "icons", label: "Icons", icon: "category" },
  { key: "graphics", label: "Graphics", icon: "image" },
  { key: "palette", label: "Palette", icon: "palette" },
  { key: "design", label: "Design", icon: "design_services" },
];

interface AssetsSidebarProps {
  activeSection: AssetSection;
  onSectionChange: (section: AssetSection) => void;
}

export function AssetsSidebar({ activeSection, onSectionChange }: AssetsSidebarProps) {
  return (
    <aside className="border-outline-variant bg-surface-container-low flex h-full w-[220px] shrink-0 flex-col border-r">
      <div className="px-md pt-md pb-sm">
        <span className="font-label-caps text-label-caps text-outline tracking-widest uppercase">
          Resources
        </span>
      </div>
      <nav className="py-xs flex flex-1 flex-col gap-px">
        {sidebarItems.map((item) => {
          const isActive = item.key === activeSection;
          return (
            <button
              key={item.key}
              onClick={() => onSectionChange(item.key)}
              className={`gap-md px-md py-sm flex cursor-pointer items-center text-left transition-all duration-150 ${
                isActive
                  ? "bg-primary-container text-on-primary-container border-primary border-l-2"
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
