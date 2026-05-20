import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav";
import { setCapturedHtml } from "../../lib/store";
import { DashboardHeader } from "./DashboardHeader";
import type { SavedProject } from "./Dashboard.types";
import { ProjectGrid } from "./ProjectGrid";
import { RenameProjectDialog } from "./RenameProjectDialog";
import { useProjectRename } from "./useProjectRename";
import { useSavedProjects } from "./useSavedProjects";

export function Dashboard() {
  const navigate = useNavigate();
  const { savedProjects, setSavedProjects } = useSavedProjects();
  const { clearRenameTarget, renameTarget, renameValue, setRenameValue, startRename, submitRename } =
    useProjectRename(setSavedProjects);

  const handleOpenProject = async (project: SavedProject) => {
    const result = await window.api.loadProject(project.id);
    if (!result.success || !result.html) return;
    setCapturedHtml(result.html, result.assetsBasePath);
    navigate(`/editor/${project.id}`);
  };

  const handleDeleteProject = async (project: SavedProject) => {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    await window.api.deleteProject(project.id);
    setSavedProjects((projects) => projects.filter((savedProject) => savedProject.id !== project.id));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="p-lg flex-1 overflow-y-auto bg-[#020617]">
        <DashboardHeader onCreateProject={() => navigate("/capture")} />
        <ProjectGrid
          projects={savedProjects}
          onOpenProject={handleOpenProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={startRename}
        />
      </main>
      <RenameProjectDialog
        project={renameTarget}
        value={renameValue}
        onChange={setRenameValue}
        onClose={clearRenameTarget}
        onSubmit={submitRename}
      />
    </div>
  );
}
