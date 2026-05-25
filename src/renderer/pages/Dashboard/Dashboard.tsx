import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav";
import { setCapturedHtml } from "../../lib/store";
import type { SavedProject } from "./Dashboard.types";
import { ProjectGrid } from "./ProjectGrid";
import { useSavedProjects } from "./useSavedProjects";

export function Dashboard() {
  const navigate = useNavigate();
  const { savedProjects, setSavedProjects } = useSavedProjects();

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

  const handleSettingsProject = (project: SavedProject) => {
    navigate(`/settings/${project.id}`);
  };

  const handleDuplicateProject = async (project: SavedProject) => {
    const result = await window.api.duplicateProject(project.id);
    if (!result.success || !result.project) return;
    const thumbnail = await window.api.getProjectThumbnail(result.project.id);
    setSavedProjects((projects) => [{ ...result.project!, thumbnail: thumbnail ?? undefined }, ...projects]);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="p-lg flex flex-1 flex-col overflow-y-auto bg-[#020617]">
        <ProjectGrid
          projects={savedProjects}
          onOpenProject={handleOpenProject}
          onDeleteProject={handleDeleteProject}
          onSettingsProject={handleSettingsProject}
          onDuplicateProject={handleDuplicateProject}
        />
      </main>
    </div>
  );
}
