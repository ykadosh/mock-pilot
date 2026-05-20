import { useParams } from "react-router-dom";

import { TypographyCard } from "./TypographyCard";
import { TypographyForm } from "./TypographyForm";
import { useProjectFonts } from "./UseProjectFonts.hooks";
import { useTypographyAssets } from "./UseTypographyAssets.hooks";

export function FontsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  useProjectFonts(projectId);
  const { typography, editingId, showAddForm, setEditingId, setShowAddForm, handleAdd, handleDelete, handleSave } = useTypographyAssets(projectId);

  return (
    <div className="mx-auto max-w-5xl">
      <FontsPageHeader onAdd={() => setShowAddForm(true)} />
      {showAddForm && <TypographyForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />}
      {typography.length === 0 && !showAddForm && <EmptyTypographyState />}
      <div className="space-y-3">
        {typography.map((item) => (
          <TypographyCard
            key={item.id}
            typography={item}
            isEditing={editingId === item.id}
            onDelete={handleDelete}
            onEdit={setEditingId}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}

function FontsPageHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="mb-lg flex items-center justify-between">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Typography</h1>
        <p className="text-ui-small text-outline">Manage your workspace typography assets.</p>
      </div>
      <button onClick={onAdd} className="bg-primary text-on-primary text-ui-small rounded-md px-4 py-2 font-medium hover:opacity-90">
        + Add Typography
      </button>
    </header>
  );
}

function EmptyTypographyState() {
  return <p className="text-outline text-ui-small">No typography assets yet. Capture a website or add one manually.</p>;
}
