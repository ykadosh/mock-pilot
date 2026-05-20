import { useState } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav";
import { AssetsSidebar } from "../../components/layout/AssetsSidebar";
import { FontsPage } from "./FontsPage";
import { ComponentsPage } from "./ComponentsPage";
import { IconsPage } from "./IconsPage";
import { GraphicsPage } from "./GraphicsPage";
import { PalettePage } from "./PalettePage";

export type AssetSection = "fonts" | "components" | "icons" | "graphics" | "palette";

export function Assets() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeSection, setActiveSection] = useState<AssetSection>("fonts");

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav activeTab="assets" projectId={projectId} />
      <div className="flex min-h-0 flex-1">
        <AssetsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="bg-background p-lg min-w-0 flex-1 overflow-y-auto">
          {activeSection === "fonts" && <FontsPage />}
          {activeSection === "components" && <ComponentsPage />}
          {activeSection === "icons" && <IconsPage />}
          {activeSection === "graphics" && <GraphicsPage />}
          {activeSection === "palette" && <PalettePage />}
        </main>
      </div>
    </div>
  );
}
