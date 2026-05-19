import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { PageLayout } from "../components/layout/PageLayout";
import { SectionCard } from "../components/ui/SectionCard";
import { Dialog } from "../components/ui/Dialog";

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

function formatStorageValue(bytes: number): { value: string; unit: string } {
  if (bytes === 0) return { value: "0", unit: "B" };
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return {
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toString(),
    unit: sizes[i],
  };
}

export function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [projectSize, setProjectSize] = useState<number | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    window.api.listProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        setName(found.title);
      }
    });
    window.api.getProjectSize(projectId).then((info) => {
      setProjectSize(info.totalBytes);
    });
  }, [projectId]);

  const hasChanges = name.trim() !== "" && name !== project?.title;

  const handleRename = async () => {
    if (!projectId || !hasChanges) return;
    await window.api.renameProject(projectId, name.trim());
    setProject((prev) => (prev ? { ...prev, title: name.trim() } : prev));
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const handleDiscard = () => {
    if (project) setName(project.title);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    await window.api.deleteProject(projectId);
    setShowDeleteDialog(false);
    navigate("/");
  };

  const handleCopyUrl = () => {
    if (!project?.url) return;
    navigator.clipboard.writeText(project.url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const createdDate = project
    ? new Date(project.createdAt)
    : null;

  const storage = projectSize !== null ? formatStorageValue(projectSize) : null;

  const lastUpdated = project
    ? new Date(project.updatedAt)
    : null;

  const timeSinceUpdate = lastUpdated
    ? getTimeSince(lastUpdated)
    : null;

  const headerActions = (
    <>
      <button
        onClick={handleDiscard}
        disabled={!hasChanges}
        className="px-md py-sm text-ui-small text-on-surface border-outline hover:bg-surface-container-high cursor-pointer border font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      >
        Discard
      </button>
      <button
        onClick={handleRename}
        disabled={!hasChanges}
        className="px-md py-sm text-ui-small bg-primary-container cursor-pointer font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {nameSaved ? "Saved ✓" : "Save Changes"}
      </button>
    </>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav activeTab="settings" projectId={projectId} />
      <div className="flex min-h-0 flex-1">
        <PageLayout
          title="General Settings"
          subtitle="Manage your project core configuration."
          headerActions={headerActions}
        >
            {project ? (
              <div className="gap-md grid grid-cols-12">
                {/* Project Name Card */}
                <SectionCard title="PROJECT NAME" className="col-span-12">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                    }}
                    className="bg-surface-container-lowest focus:border-primary-container focus:ring-primary-container text-on-surface font-body-main px-md py-md w-full border border-[#334155] transition-all outline-none focus:ring-1"
                  />
                  <p className="mt-sm text-ui-small text-outline">
                    The display name for this project.
                  </p>
                </SectionCard>

                {/* Technical Metadata Section */}
                <SectionCard title="TECHNICAL INFORMATION" className="col-span-12">
                  <div className="gap-lg grid grid-cols-1 md:grid-cols-3">
                    {/* Source URL */}
                    <div className="space-y-xs">
                      <span className="text-label-caps font-label-caps text-outline block">
                        Source URL
                      </span>
                      <div className="gap-xs font-code-block text-code-block text-on-surface bg-surface-container-lowest px-sm py-xs flex items-center overflow-hidden border border-[#334155]">
                        <span className="flex-1 truncate">{project.url}</span>
                        <span
                          className="material-symbols-outlined hover:text-primary shrink-0 cursor-pointer text-sm"
                          onClick={handleCopyUrl}
                          title={urlCopied ? "Copied!" : "Copy URL"}
                        >
                          {urlCopied ? "check" : "content_copy"}
                        </span>
                      </div>
                    </div>

                    {/* Date Created */}
                    <div className="space-y-xs">
                      <span className="text-label-caps font-label-caps text-outline block">
                        Date Created
                      </span>
                      {createdDate && (
                        <>
                          <div className="font-body-main text-on-surface">
                            {createdDate.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-ui-small text-outline">
                            {createdDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: false,
                              timeZoneName: "short",
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Storage Consumption */}
                    <div className="space-y-xs">
                      <span className="text-label-caps font-label-caps text-outline block">
                        Storage Consumption
                      </span>
                      <div className="gap-xs flex items-end">
                        <span className="font-headline-md text-headline-md text-on-surface">
                          {storage ? storage.value : "—"}
                        </span>
                        {storage && (
                          <span className="text-ui-small text-outline mb-0.5">
                            {storage.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Last Activity */}
                <SectionCard title="LAST ACTIVITY" className="col-span-12">
                  <div className="gap-md flex items-center">
                    <div className="text-on-surface-variant text-4xl font-bold opacity-20">
                      {timeSinceUpdate ?? "—"}
                    </div>
                    <div className="font-body-main text-on-surface">
                      <p>
                        Last modified{" "}
                        {lastUpdated
                          ? lastUpdated.toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "never"}
                      </p>
                    </div>
                  </div>
                </SectionCard>

                {/* Danger Zone */}
                <SectionCard title="DANGER ZONE" variant="danger" className="mt-lg col-span-12">
                  <div className="gap-md flex flex-col justify-between md:flex-row md:items-center">
                    <p className="font-body-main text-on-surface">
                      Permanently remove this project and all its associated
                      data. This action is irreversible.
                    </p>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="bg-error-container text-on-error-container px-lg py-sm text-ui-small hover:bg-error gap-sm flex shrink-0 cursor-pointer items-center font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete_forever
                      </span>
                      Delete Project
                    </button>
                  </div>
                </SectionCard>
              </div>
            ) : (
              <p className="text-body-main text-on-surface-variant">
                No project selected.
              </p>
            )}

            <Dialog
              open={showDeleteDialog}
              onClose={() => setShowDeleteDialog(false)}
            >
              <h2 className="font-headline-md text-headline-md text-on-surface mb-sm">
                Delete Project
              </h2>
              <p className="text-body-main text-on-surface-variant mb-lg">
                Are you sure you want to delete{" "}
                <span className="text-on-surface font-medium">
                  {project?.title}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="gap-sm flex justify-end">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="px-md py-sm text-ui-small text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-error-container text-on-error-container px-md py-sm font-ui-small text-ui-small cursor-pointer rounded-lg transition-all active:opacity-80"
                >
                  Delete
                </button>
              </div>
            </Dialog>
        </PageLayout>
      </div>
    </div>
  );
}

function getTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}
