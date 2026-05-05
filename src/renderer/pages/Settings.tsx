import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import { Dialog } from "../components/ui/Dialog";

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    window.api.listProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        setName(found.title);
      }
    });
  }, [projectId]);

  const handleRename = async () => {
    if (!projectId || !name.trim() || name === project?.title) return;
    await window.api.renameProject(projectId, name.trim());
    setProject((prev) => prev ? { ...prev, title: name.trim() } : prev);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    await window.api.deleteProject(projectId);
    setShowDeleteDialog(false);
    navigate("/");
  };

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <SideNav activeTab="settings" defaultCollapsed projectId={projectId} />
        <main className="flex-1 min-w-0 bg-[#020617] overflow-y-auto p-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-lg">
            Project Settings
          </h1>

          {project ? (
            <div className="space-y-xl max-w-2xl">
              {/* Project Info */}
              <section>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-md">
                  General
                </h2>
                <div className="bg-surface-container border border-outline-variant/20 rounded-lg p-md space-y-md">
                  <div>
                    <label className="text-ui-small text-on-surface-variant uppercase font-bold tracking-wider">
                      Project Name
                    </label>
                    <div className="flex items-center gap-sm mt-xs">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-sm py-xs text-body-main text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        onClick={handleRename}
                        disabled={!name.trim() || name === project.title}
                        className="text-ui-small text-primary hover:text-surface-tint disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        {nameSaved ? "Saved ✓" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-ui-small text-on-surface-variant uppercase font-bold tracking-wider">
                      Source URL
                    </label>
                    <p className="text-body-main text-on-surface mt-xs font-mono text-sm">{project.url}</p>
                  </div>
                  <div>
                    <label className="text-ui-small text-on-surface-variant uppercase font-bold tracking-wider">
                      Created
                    </label>
                    <p className="text-body-main text-on-surface mt-xs">
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              <section>
                <h2 className="font-headline-md text-headline-md text-error mb-md">
                  Danger Zone
                </h2>
                <div className="bg-surface-container border border-error/20 rounded-lg p-md flex items-center justify-between">
                  <div>
                    <p className="text-body-main text-on-surface font-medium">Delete this project</p>
                    <p className="text-ui-small text-on-surface-variant mt-xs">
                      Permanently remove this project and all its data.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="bg-error-container text-on-error-container px-md py-sm font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all"
                  >
                    Delete Project
                  </button>
                </div>
              </section>
            </div>
          ) : (
            <p className="text-body-main text-on-surface-variant">No project selected.</p>
          )}

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
              Delete Project
            </h2>
            <p className="text-body-main text-on-surface-variant mb-lg">
              Are you sure you want to delete{" "}
              <span className="text-on-surface font-medium">{project?.title}</span>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-md py-sm text-ui-small text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-error-container text-on-error-container px-md py-sm font-ui-small text-ui-small rounded-lg cursor-pointer active:opacity-80 transition-all"
              >
                Delete
              </button>
            </div>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
