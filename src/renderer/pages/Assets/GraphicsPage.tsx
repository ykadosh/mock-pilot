import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { PinAttachmentButton } from "../../components/PinAttachmentButton";

type ViewMode = "grid" | "list";

interface GraphicAsset {
  filename: string;
  extension: string;
  sizeBytes: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAssetUrl(projectId: string, filename: string): string {
  return `mp-asset://assets/${projectId}/assets/${filename}`;
}

export function GraphicsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [graphics, setGraphics] = useState<GraphicAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const loadGraphics = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const result = await window.api.listProjectGraphics(projectId);
    if (result.success && result.graphics) setGraphics(result.graphics);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { void loadGraphics(); }, [loadGraphics]);

  return (
    <div className="mx-auto max-w-5xl">
      <GraphicsPageHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      {loading && <LoadingState />}
      {!loading && graphics.length === 0 && <EmptyState />}
      {!loading && graphics.length > 0 && viewMode === "grid" && (
        <GraphicsGrid graphics={graphics} projectId={projectId!} />
      )}
      {!loading && graphics.length > 0 && viewMode === "list" && (
        <GraphicsList graphics={graphics} projectId={projectId!} />
      )}
    </div>
  );
}

function GraphicsPageHeader({ viewMode, onViewModeChange }: { viewMode: ViewMode; onViewModeChange: (mode: ViewMode) => void }) {
  return (
    <header className="mb-lg flex items-center justify-between">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Graphics</h1>
        <p className="text-ui-small text-outline">Browse your workspace graphic assets.</p>
      </div>
      <div className="border-outline/20 flex gap-1 rounded-md border p-0.5">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-primary text-on-primary" : "text-outline hover:text-on-surface"}`}
        >
          Grid
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "list" ? "bg-primary text-on-primary" : "text-outline hover:text-on-surface"}`}
        >
          List
        </button>
      </div>
    </header>
  );
}

function LoadingState() {
  return <p className="text-outline text-ui-small">Loading graphics…</p>;
}

function EmptyState() {
  return <p className="text-outline text-ui-small">No graphic assets found. Capture a website to collect images.</p>;
}

function GraphicsGrid({ graphics, projectId }: { graphics: GraphicAsset[]; projectId: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {graphics.map((graphic) => (
        <div key={graphic.filename} className="group border-outline/20 bg-surface-container relative overflow-hidden rounded-lg border">
          <div className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100">
            <PinAttachmentButton projectId={projectId} attachment={{ type: "graphic", filename: graphic.filename, extension: graphic.extension, sizeBytes: graphic.sizeBytes, projectId }} variant="overlay" className="!static" />
          </div>
          <div className="flex aspect-square items-center justify-center p-2">
            <img
              src={getAssetUrl(projectId, graphic.filename)}
              alt={graphic.filename}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="border-outline/10 border-t px-2 py-1.5">
            <p className="text-on-surface truncate text-xs font-medium" title={graphic.filename}>
              {graphic.filename}
            </p>
            <p className="text-outline text-[10px]">
              {graphic.extension.toUpperCase()} · {formatFileSize(graphic.sizeBytes)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GraphicsListRow({ graphic, projectId }: { graphic: GraphicAsset; projectId: string }) {
  return (
    <tr className="hover:bg-surface-container/50">
      <td className="px-4 py-2">
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded">
          <img src={getAssetUrl(projectId, graphic.filename)} alt={graphic.filename} className="max-h-full max-w-full object-contain" loading="lazy" />
        </div>
      </td>
      <td className="text-on-surface px-4 py-2 text-xs font-medium">{graphic.filename}</td>
      <td className="px-4 py-2">
        <span className="bg-surface-container text-outline rounded px-1.5 py-0.5 text-[10px] font-medium uppercase">{graphic.extension}</span>
      </td>
      <td className="text-outline px-4 py-2 text-right text-xs">{formatFileSize(graphic.sizeBytes)}</td>
      <td className="px-4 py-2 text-right">
        <PinAttachmentButton projectId={projectId} attachment={{ type: "graphic", filename: graphic.filename, extension: graphic.extension, sizeBytes: graphic.sizeBytes, projectId }} variant="icon" />
      </td>
    </tr>
  );
}

function GraphicsList({ graphics, projectId }: { graphics: GraphicAsset[]; projectId: string }) {
  return (
    <div className="border-outline/20 overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container border-outline/10 border-b">
          <tr>
            <th className="text-outline px-4 py-2 text-xs font-medium">Preview</th>
            <th className="text-outline px-4 py-2 text-xs font-medium">Filename</th>
            <th className="text-outline px-4 py-2 text-xs font-medium">Type</th>
            <th className="text-outline px-4 py-2 text-right text-xs font-medium">Size</th>
            <th className="text-outline px-4 py-2 text-right text-xs font-medium">Pin</th>
          </tr>
        </thead>
        <tbody className="divide-outline/10 divide-y">
          {graphics.map((graphic) => (
            <GraphicsListRow key={graphic.filename} graphic={graphic} projectId={projectId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
