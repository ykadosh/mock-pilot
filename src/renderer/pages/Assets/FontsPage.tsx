import { useRef } from "react";
import { useParams } from "react-router-dom";

import { Drawer } from "../../components/ui/Drawer";
import type { AvailableFonts } from "./fontFaceParser";
import { TypographyCard } from "./TypographyCard";
import { TypographyForm, type TypographyFormRef } from "./TypographyForm";
import { useProjectFonts } from "./UseProjectFonts.hooks";
import { useTypographyAssets } from "./UseTypographyAssets.hooks";

export function FontsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  useProjectFonts(projectId);
  const { typography, availableFonts, editingId, showAddForm, setEditingId, setShowAddForm, handleAdd, handleDelete, handleSave } = useTypographyAssets(projectId);
  const addFormRef = useRef<TypographyFormRef>(null);
  const editFormRef = useRef<TypographyFormRef>(null);

  const editingTypography = typography.find((t) => t.id === editingId);

  return (
    <div className="mx-auto max-w-5xl">
      <FontsPageHeader onAdd={() => setShowAddForm(true)} />
      {typography.length === 0 && !showAddForm && <EmptyTypographyState />}
      <div className="space-y-3">
        {typography.map((item) => (
          <TypographyCard key={item.id} typography={item} projectId={projectId} onDelete={handleDelete} onEdit={setEditingId} />
        ))}
      </div>
      <AddTypographyDrawer
        open={showAddForm}
        formRef={addFormRef}
        availableFonts={availableFonts}
        onClose={() => setShowAddForm(false)}
        onSave={handleAdd}
      />
      <EditTypographyDrawer
        open={!!editingTypography}
        formRef={editFormRef}
        typography={editingTypography}
        availableFonts={availableFonts}
        onClose={() => setEditingId(null)}
        onSave={handleSave}
      />
    </div>
  );
}

function AddTypographyDrawer({ open, formRef, availableFonts, onClose, onSave }: {
  open: boolean;
  formRef: React.RefObject<TypographyFormRef>;
  availableFonts: AvailableFonts;
  onClose: () => void;
  onSave: (values: Omit<TypographyAsset, "id">) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} icon="text_fields" title="Add Typography" confirmLabel="Add Typography" onConfirm={() => formRef.current?.submit()}>
      <TypographyForm ref={formRef} availableFonts={availableFonts} onSave={onSave} />
    </Drawer>
  );
}

function EditTypographyDrawer({ open, formRef, typography, availableFonts, onClose, onSave }: {
  open: boolean;
  formRef: React.RefObject<TypographyFormRef>;
  typography: TypographyAsset | undefined;
  availableFonts: AvailableFonts;
  onClose: () => void;
  onSave: (item: TypographyAsset) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} icon="text_fields" title="Edit Typography" confirmLabel="Save Changes" onConfirm={() => formRef.current?.submit()}>
      {typography && <TypographyForm ref={formRef} initial={typography} availableFonts={availableFonts} onSave={(values) => onSave({ ...values, id: typography.id })} />}
    </Drawer>
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
