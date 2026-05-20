import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useComponentAssets } from "./UseComponentAssets.hooks";
import { ComponentCodeBlock, ComponentPreview } from "./ComponentWidgets";

export function ComponentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { components, componentsCss, editingId, setEditingId, handleDelete, handleRename } = useComponentAssets(projectId);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
          Components
        </h1>
        <p className="text-ui-small text-outline">
          Reusable UI components detected in the captured website.
        </p>
      </header>
      {components.length === 0 && <EmptyState />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {components.map((component) => (
          <ComponentCard
            key={component.id}
            component={component}
            css={componentsCss}
            isEditing={editingId === component.id}
            onDelete={handleDelete}
            onEdit={setEditingId}
            onRename={handleRename}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-outline text-ui-small">
      No components detected. Capture a website with reusable UI patterns to see them here.
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
  isEditing: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  onRename: (id: string, newLabel: string) => void;
}

function ComponentCard({ component, css, isEditing, onDelete, onEdit, onRename }: ComponentCardProps) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="border-outline/20 bg-surface rounded-lg border p-4">
      <ComponentCardHeader component={component} isEditing={isEditing} onEdit={onEdit} onRename={onRename} />
      {component.description && (
        <p className="text-outline mb-2 text-xs">{component.description}</p>
      )}
      <ComponentPreview html={component.html} css={css} />
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
