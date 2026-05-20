import { NewProjectCard, ProjectCard } from "../../components/ProjectCard";
import type { SavedProject } from "./Dashboard.types";

interface ProjectGridProps {
  projects: SavedProject[];
  onDeleteProject: (project: SavedProject) => void;
  onOpenProject: (project: SavedProject) => void;
  onRenameProject: (project: SavedProject) => void;
}

export function ProjectGrid({
  projects,
  onDeleteProject,
  onOpenProject,
  onRenameProject,
}: ProjectGridProps) {
  return (
    <div className="gap-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          title={project.title}
          url={project.url}
          imageUrl={project.thumbnail}
          lastEdit={formatProjectDate(project.updatedAt)}
          isHero={index === 0}
          onClick={() => onOpenProject(project)}
          onDelete={() => onDeleteProject(project)}
          onRename={() => onRenameProject(project)}
        />
      ))}
      <NewProjectCard />
    </div>
  );
}

function formatProjectDate(iso: string) {
  const date = new Date(iso);
  const diffHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
