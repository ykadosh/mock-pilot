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
}

export function Dashboard() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    window.api.listProjects().then(setSavedProjects);
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await window.api.captureWebsite(url.trim());
      if (result.success && result.html) {
        // Extract title from URL
        let title: string;
        try {
          title = new URL(url.trim()).hostname.replace(/^www\./, "");
        } catch {
          title = url.trim();
        }

        // Save project
        const project = await window.api.saveProject({
          url: url.trim(),
          title,
          html: result.html,
        });

        setCapturedHtml(result.html);
        setDialogOpen(false);
        navigate(`/editor/${project.id}`);
      } else {
        setError(result.error || "Failed to capture website");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = async (project: SavedProject) => {
    const result = await window.api.loadProject(project.id);
    if (result.success && result.html) {
      setCapturedHtml(result.html);
      navigate(`/editor/${project.id}`);
    }
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
    <>
      <TopNav />
      <main className="mt-12 p-lg min-h-[calc(100vh-48px)] bg-[#020617]">
      {/* Dashboard Header */}
      <section className="flex justify-between items-end mb-xl">
        <div className="space-y-xs">
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Recent Projects
          </h1>
          <p className="font-body-main text-on-surface-variant opacity-70">
            Manage and iterate on your active workspace deployments.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="bg-primary hover:bg-surface-tint text-on-primary-fixed flex items-center gap-sm px-lg py-md rounded transition-all font-ui-small font-bold shadow-lg shadow-primary/10"
        >
          <span className="material-symbols-outlined">add_circle</span>
          New Project
        </button>
      </section>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {savedProjects.map((project, i) => (
          <ProjectCard
            key={project.id}
            title={project.title}
            url={project.url}
            lastEdit={formatDate(project.updatedAt)}
            isHero={i === 0}
            isActive={i === 0}
            onClick={() => handleOpenProject(project)}
          />
        ))}
        <NewProjectCard />
      </div>

      {/* Bottom Section */}
      <div className="mt-xl grid grid-cols-1 lg:grid-cols-3 gap-md">
        {/* Activity Feed */}
        <div className="lg:col-span-1 bg-surface-container-low border border-outline-variant/20 p-md">
          <h4 className="font-label-caps text-label-caps text-secondary mb-md border-b border-outline-variant/20 pb-sm">
            Recent Activity
          </h4>
          <div className="space-y-md">
            {savedProjects.slice(0, 3).map((project) => (
              <div key={project.id} className="flex gap-sm">
                <span className="material-symbols-outlined text-xs text-on-primary">
                  check_circle
                </span>
                <div className="space-y-unit">
                  <p className="text-ui-small text-on-surface">
                    Created{" "}
                    <span className="text-primary">{project.title}</span>
                  </p>
                  <p className="text-[10px] text-on-surface-variant opacity-50">
                    {formatDate(project.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {savedProjects.length === 0 && (
              <p className="text-ui-small text-on-surface-variant opacity-50">No activity yet</p>
            )}
          </div>
        </div>

        {/* Workspace Usage */}
        <div className="lg:col-span-2 bg-surface-container-low border border-outline-variant/20 p-md flex items-center justify-between">
          <div>
            <h4 className="font-label-caps text-label-caps text-secondary mb-md border-b border-outline-variant/20 pb-sm">
              Workspace Usage
            </h4>
            <div className="flex items-end gap-xl">
              <div className="space-y-xs">
                <span className="text-headline-lg font-headline-lg text-on-surface">
                  {savedProjects.length}
                </span>
                <p className="text-ui-small text-on-surface-variant">
                  Projects Saved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

      <Dialog open={dialogOpen} onClose={() => !loading && setDialogOpen(false)}>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
          New Project
        </h2>
        <p className="text-body-main text-on-surface-variant mb-lg">
          Paste the URL of the website you want to mock.
        </p>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          disabled={loading}
          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors mb-sm disabled:opacity-50"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && url.trim() && !loading) handleCreate();
          }}
        />
        {error && (
          <p className="text-ui-small text-error mb-sm">{error}</p>
        )}
        <div className="flex justify-end mt-md">
          <button
            onClick={handleCreate}
            disabled={!url.trim() || loading}
            className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-sm"
          >
            {loading && (
              <span className="material-symbols-outlined animate-spin text-sm">
                progress_activity
              </span>
            )}
            {loading ? "Capturing..." : "Create"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
