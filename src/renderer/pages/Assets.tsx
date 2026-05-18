import { useState } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { AssetsSidebar } from "../components/layout/AssetsSidebar";
import { FontsPage } from "./assets/FontsPage";
import { ComponentsPage } from "./assets/ComponentsPage";
import { IconsPage } from "./assets/IconsPage";
import { GraphicsPage } from "./assets/GraphicsPage";
import { PalettePage } from "./assets/PalettePage";

export type AssetSection = "fonts" | "components" | "icons" | "graphics" | "palette";

export function Assets() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeSection, setActiveSection] = useState<AssetSection>("fonts");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav activeTab="assets" projectId={projectId} />
      <div className="flex flex-1 min-h-0">
        <AssetsSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="flex-1 min-w-0 bg-background overflow-y-auto p-lg">
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
