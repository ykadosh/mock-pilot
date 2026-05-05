import { useEffect, useState } from "react";
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
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<ProjectMeta | null>(null);

  useEffect(() => {
    window.api.listProjects().then(setProjects);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await window.api.deleteProject(deleteTarget.id);
    setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="overflow-hidden">
      <TopNav />
      <div className="flex pt-12 h-screen">
        <SideNav activeTab="settings" defaultCollapsed />
        <main className="flex-1 min-w-0 bg-[#020617] overflow-y-auto p-lg">
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-lg">
            Settings
          </h1>

          {/* Projects Section */}
          <section className="mb-xl">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-md">
              Projects
            </h2>
            <p className="text-body-main text-on-surface-variant mb-lg">
              Manage your saved projects. Deleting a project removes all its data permanently.
            </p>

            {projects.length === 0 ? (
              <p className="text-ui-small text-on-surface-variant opacity-50">
                No projects saved yet.
              </p>
            ) : (
              <div className="space-y-sm">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between bg-surface-container border border-outline-variant/20 rounded-lg px-md py-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-body-main text-on-surface font-medium truncate">
                        {project.title}
                      </h3>
                      <p className="text-ui-small text-on-surface-variant truncate">
                        {project.url} · Created {formatDate(project.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteTarget(project)}
                      className="ml-md text-slate-500 hover:text-error transition-colors cursor-pointer flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
              Delete Project
            </h2>
            <p className="text-body-main text-on-surface-variant mb-lg">
              Are you sure you want to delete{" "}
              <span className="text-on-surface font-medium">
                {deleteTarget?.title}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-sm">
              <button
                onClick={() => setDeleteTarget(null)}
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
