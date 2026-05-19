import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "./ui/Dialog";

function resolveProjectTitle(url: string, capturedTitle?: string) {
  if (capturedTitle?.trim()) return capturedTitle.trim();
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function createProjectFromUrl(url: string) {
  const result = await window.api.captureWebsite(url);
  if (!result.success || !result.html) throw new Error(result.error || "Failed to capture website");
  const project = await window.api.saveProject({ url, title: resolveProjectTitle(url, result.title), html: result.html, thumbnail: result.thumbnail });
  return { html: result.html, projectId: project.id };
}

function NewProjectTrigger({ onClick }: { onClick: () => void }) {
  return <div onClick={onClick} className="group border-outline-variant/30 p-xl hover:border-primary/50 bg-surface-container/20 flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed transition-all"><div className="border-outline-variant/50 mb-md group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full border transition-all group-hover:scale-110"><span className="material-symbols-outlined text-primary">add</span></div><span className="font-headline-md text-on-surface-variant">Start a New Project</span><p className="text-ui-small text-on-surface-variant/40 mt-xs text-center">Import from URL or use a pre-built template.</p></div>;
}

function NewProjectDialog({ dialogOpen, url, error, loading, onClose, onCreate, onUrlChange }: { dialogOpen: boolean; url: string; error: string; loading: boolean; onClose: () => void; onCreate: () => void; onUrlChange: (value: string) => void; }) {
  const canCreate = Boolean(url.trim()) && !loading;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canCreate) onCreate();
  };
  return <Dialog open={dialogOpen} onClose={onClose}><h2 className="font-headline-md text-headline-md text-on-surface mb-sm">New Project</h2><p className="text-body-main text-on-surface-variant mb-lg">Paste the URL of the website you want to mock.</p><input type="url" value={url} onChange={(event) => onUrlChange(event.target.value)} placeholder="https://example.com" disabled={loading} className="bg-surface-container-lowest border-outline-variant/50 px-md py-sm text-body-main text-on-surface placeholder-on-surface-variant/40 focus:border-primary mb-sm w-full rounded-lg border transition-colors focus:outline-none disabled:opacity-50" autoFocus onKeyDown={handleKeyDown} />{error && <p className="text-ui-small text-error mb-sm">{error}</p>}<div className="mt-md flex justify-end"><button onClick={onCreate} disabled={!canCreate} className="bg-primary-container text-on-primary-container px-lg py-sm font-ui-small text-ui-small gap-sm flex cursor-pointer items-center rounded-lg transition-all active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40">{loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}{loading ? "Capturing..." : "Create"}</button></div></Dialog>;
}

export function NewProjectCard() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleClose = () => {
    if (!loading) setDialogOpen(false);
  };
  const handleCreate = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setLoading(true);
    setError("");
    try {
      const { html, projectId } = await createProjectFromUrl(trimmedUrl);
      const { setCapturedHtml } = await import("../lib/store");
      setCapturedHtml(html);
      setDialogOpen(false);
      navigate(`/editor/${projectId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };
  return <><NewProjectTrigger onClick={() => setDialogOpen(true)} /><NewProjectDialog dialogOpen={dialogOpen} url={url} error={error} loading={loading} onClose={handleClose} onCreate={handleCreate} onUrlChange={setUrl} /></>;
}
