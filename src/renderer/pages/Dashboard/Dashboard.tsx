import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopNav } from "../../components/layout/TopNav";
import { setCapturedHtml } from "../../lib/store";
import type { SavedProject } from "./Dashboard.types";
import { ProjectGrid } from "./ProjectGrid";
import { useSavedProjects } from "./useSavedProjects";
import { DeleteProjectDialog } from "../Settings/DeleteProjectDialog";

function useDashboardActions(setSavedProjects: ReturnType<typeof useSavedProjects>["setSavedProjects"]) {
  const navigate = useNavigate();
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null);

  const handleOpenProject = async (project: SavedProject) => {
    const result = await window.api.loadProject(project.id);
    if (!result.success || !result.html) return;
    setCapturedHtml(result.html, result.assetsBasePath);
    navigate(`/editor/${project.id}`);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    await window.api.deleteProject(projectToDelete.id);
    setSavedProjects((projects) => projects.filter((p) => p.id !== projectToDelete.id));
    setProjectToDelete(null);
  };

  const handleSettingsProject = (project: SavedProject) => navigate(`/settings/${project.id}`);

  const handleDuplicateProject = async (project: SavedProject) => {
    const result = await window.api.duplicateProject(project.id);
    if (!result.success || !result.project) return;
    const thumbnail = await window.api.getProjectThumbnail(result.project.id);
    setSavedProjects((projects) => [{ ...result.project!, thumbnail: thumbnail ?? undefined }, ...projects]);
  };

  return { projectToDelete, setProjectToDelete, handleOpenProject, handleDeleteProject, handleSettingsProject, handleDuplicateProject };
}

export function Dashboard() {
  const { savedProjects, setSavedProjects } = useSavedProjects();
  const actions = useDashboardActions(setSavedProjects);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="p-lg flex flex-1 flex-col overflow-y-auto bg-[#020617]">
        <ProjectGrid
          projects={savedProjects}
          onOpenProject={actions.handleOpenProject}
          onDeleteProject={actions.setProjectToDelete}
          onSettingsProject={actions.handleSettingsProject}
          onDuplicateProject={actions.handleDuplicateProject}
        />
      </main>
      <DeleteProjectDialog
        open={!!actions.projectToDelete}
        projectTitle={actions.projectToDelete?.title}
        onClose={() => actions.setProjectToDelete(null)}
        onDelete={actions.handleDeleteProject}
      />
    </div>
  );
}
