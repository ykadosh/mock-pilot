import { useEffect, useState } from "react";
import { ProjectCard, NewProjectCard } from "../components/ProjectCard";
import { TopNav } from "../components/layout/TopNav";
import { Dialog } from "../components/ui/Dialog";
import { useNavigate } from "react-router-dom";
import { setCapturedHtml } from "../lib/store";

interface SavedProject {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [renameTarget, setRenameTarget] = useState<SavedProject | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    async function loadProjects() {
      const projects = await window.api.listProjects();
      // Load thumbnails
      const withThumbnails = await Promise.all(
        projects.map(async (p) => {
          const thumbnail = await window.api.getProjectThumbnail(p.id);
          return { ...p, thumbnail: thumbnail || undefined };
        })
      );
      // Sort by last edit time (most recent first)
      withThumbnails.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setSavedProjects(withThumbnails);
    }
    loadProjects();
  }, []);

  const handleOpenProject = async (project: SavedProject) => {
    const result = await window.api.loadProject(project.id);
    if (result.success && result.html) {
      setCapturedHtml(result.html, result.assetsBasePath);
      navigate(`/editor/${project.id}`);
    }
  };

  const handleDeleteProject = async (project: SavedProject) => {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    await window.api.deleteProject(project.id);
    setSavedProjects((prev) => prev.filter((p) => p.id !== project.id));
  };

  const handleRenameProject = (project: SavedProject) => {
    setRenameTarget(project);
    setRenameValue(project.title);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await window.api.renameProject(renameTarget.id, renameValue.trim());
    setSavedProjects((prev) =>
      prev.map((p) => (p.id === renameTarget.id ? { ...p, title: renameValue.trim() } : p))
    );
    setRenameTarget(null);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav />
      <main className="p-lg flex-1 overflow-y-auto bg-[#020617]">
      {/* Dashboard Header */}
      <section className="mb-xl flex items-end justify-between">
        <div className="space-y-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Recent Projects
          </h1>
          <p className="font-body-main text-on-surface-variant opacity-70">
            Manage and iterate on your active workspace deployments.
          </p>
        </div>
        <button
          onClick={() => navigate("/capture")}
          className="bg-primary hover:bg-surface-tint text-on-primary-fixed gap-sm px-lg py-md font-ui-small shadow-primary/10 flex items-center rounded font-bold shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          New Project
        </button>
      </section>

      {/* Project Grid */}
      <div className="gap-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {savedProjects.map((project, i) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            url={project.url}
            imageUrl={project.thumbnail}
            lastEdit={formatDate(project.updatedAt)}
            isHero={i === 0}
            onClick={() => handleOpenProject(project)}
            onDelete={() => handleDeleteProject(project)}
            onRename={() => handleRenameProject(project)}
          />
        ))}
        <NewProjectCard />
      </div>
    </main>

      <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
          Rename Project
        </h2>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="Project name"
          className="bg-surface-container-lowest border-outline-variant/50 px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:border-primary mb-sm w-full rounded-lg border transition-colors focus:outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && renameValue.trim()) handleRenameSubmit();
          }}
        />
        <div className="mt-md flex justify-end">
          <button
            onClick={handleRenameSubmit}
            disabled={!renameValue.trim()}
            className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small cursor-pointer rounded-lg transition-all active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rename
          </button>
        </div>
      </Dialog>
    </div>
  );
}
