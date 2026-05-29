import { useRef, useEffect, useState } from "react";
import type { LegacyRef } from "react";
import { useParams } from "react-router-dom";
import { useComponentAssets } from "./UseComponentAssets.hooks";
import { ComponentCodeBlock, ComponentPreview } from "./ComponentWidgets";

export function ComponentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { components, componentsCss, editingId, setEditingId, handleDelete, handleRename, isAnalyzing, handleScan, scanWebviewRef } = useComponentAssets(projectId);

  return (
    <div className="mx-auto max-w-5xl">
      <ComponentsPageHeader onScan={handleScan} isAnalyzing={isAnalyzing} disabled={!projectId} />
      {components.length === 0 && <EmptyState />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {components.map((component) => (
          <ComponentCard key={component.id} component={component} css={componentsCss} projectId={projectId} isEditing={editingId === component.id} onDelete={handleDelete} onEdit={setEditingId} onRename={handleRename} />
        ))}
      </div>
      {isAnalyzing && projectId && <ScanOverlay projectId={projectId} scanWebviewRef={scanWebviewRef} />}
    </div>
  );
}

function ScanOverlay({ projectId, scanWebviewRef }: { projectId: string; scanWebviewRef: React.RefObject<Electron.WebviewTag | null> }) {
  // The webview must remain on-screen and painted so webview.capturePage() (used by
  // extractComponents) doesn't fail with UnknownVizError. We mount it in a fixed
  // container and stack an opaque card on top of it so the user sees a loader card
  // instead of the live page, but the rest of the app remains visible and interactive.
  return (
    <div className="fixed right-6 bottom-6 z-50" style={{ width: 320, height: 200 }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <webview ref={scanWebviewRef as LegacyRef<Electron.WebviewTag>} src={`mp-asset://assets/${projectId}/project.html`} style={{ width: "1024px", height: "640px", display: "inline-flex" }} />
      </div>
      <div className="border-outline/20 bg-surface text-on-surface absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border shadow-xl">
        <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
        <div className="text-ui-small font-medium">Scanning page for components…</div>
        <div className="text-outline text-xs">This may take a moment</div>
      </div>
    </div>
  );
}

function ComponentsPageHeader({ onScan, isAnalyzing, disabled }: { onScan: () => void; isAnalyzing: boolean; disabled: boolean }) {
  return (
    <header className="mb-lg flex items-center justify-between">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Components</h1>
        <p className="text-ui-small text-outline">Reusable UI components detected in the captured website.</p>
      </div>
      <button onClick={onScan} disabled={disabled || isAnalyzing} className="bg-primary text-on-primary text-ui-small rounded-md px-4 py-2 font-medium hover:opacity-90 disabled:opacity-50">
        {isAnalyzing ? "Scanning…" : "Scan for components"}
      </button>
    </header>
  );
}

function EmptyState() {
  return (
    <p className="text-outline text-ui-small">
      No components detected. Click <span className="font-medium">Scan for components</span> to analyze the captured website for reusable UI patterns.
    </p>
  );
}

interface ComponentProp {
  name: string;
  type: string;
  description: string;
}

interface ComponentCardProps {
  component: { id: string; label: string; html: string; count: number; description?: string; props?: ComponentProp[] };
  css?: string;
  projectId?: string;
  isEditing: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  onRename: (id: string, newLabel: string) => void;
}

function ComponentCard({ component, css, projectId, isEditing, onDelete, onEdit, onRename }: ComponentCardProps) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="border-outline/20 bg-surface rounded-lg border p-4">
      <ComponentCardHeader component={component} isEditing={isEditing} onEdit={onEdit} onRename={onRename} />
      {component.description && (
        <p className="text-outline mb-2 text-xs">{component.description}</p>
      )}
      <ComponentPreview html={component.html} css={css} projectId={projectId} />
      {component.props && component.props.length > 0 && <PropsList props={component.props} />}
      <ComponentCardActions showCode={showCode} onToggleCode={() => setShowCode(!showCode)} onDelete={() => onDelete(component.id)} />
      {showCode && <ComponentCodeBlock html={component.html} />}
    </div>
  );
}

function ComponentCardHeader({ component, isEditing, onEdit, onRename }: Pick<ComponentCardProps, "component" | "isEditing" | "onEdit" | "onRename">) {
  return (
    <div className="mb-2 flex items-start justify-between">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <RenameInput currentLabel={component.label} onSave={(v) => onRename(component.id, v)} onCancel={() => onEdit(null)} />
        ) : (
          <h3 className="text-on-surface cursor-pointer truncate text-sm font-medium hover:underline" onClick={() => onEdit(component.id)} title="Click to rename">
            {component.label}
          </h3>
        )}
      </div>
      <span className="bg-primary/10 text-primary ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium">
        ×{component.count}
      </span>
    </div>
  );
}

function PropsList({ props }: { props: ComponentProp[] }) {
  return (
    <div className="border-outline/10 mt-2 rounded border p-2">
      <p className="text-outline mb-1 text-[10px] font-medium tracking-wide uppercase">Props</p>
      <div className="flex flex-wrap gap-1">
        {props.map((prop) => (
          <span key={prop.name} className="bg-background text-on-surface inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]" title={prop.description}>
            <span className="font-medium">{prop.name}</span>
            <span className="text-outline">: {prop.type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ComponentCardActions({ showCode, onToggleCode, onDelete }: { showCode: boolean; onToggleCode: () => void; onDelete: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button onClick={onToggleCode} className="text-outline hover:text-on-surface text-xs underline">
        {showCode ? "Hide code" : "Show code"}
      </button>
      <button onClick={onDelete} className="text-outline hover:text-error ml-auto text-xs">
        Remove
      </button>
    </div>
  );
}

function RenameInput({ currentLabel, onSave, onCancel }: { currentLabel: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(value.trim() || currentLabel); }} className="flex gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onCancel}
        className="border-outline/30 bg-background text-on-surface w-full rounded border px-2 py-0.5 text-sm"
      />
    </form>
  );
}
