import { useRef } from "react";

import { Drawer } from "../../components/ui/Drawer";
import { ColorForm, type ColorFormRef } from "./ColorForm";
import { PaletteGrid } from "./PaletteGrid";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PalettePageContentProps {
  projectId: string | undefined;
  colors: ColorAsset[];
  editingId: string | null;
  showAddForm: boolean;
  onAdd: (item: Omit<ColorAsset, "id">) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  onSave: (item: ColorAsset) => void;
  onToggleAddForm: (show: boolean) => void;
}

export function PalettePageContent(props: PalettePageContentProps) {
  const addFormRef = useRef<ColorFormRef>(null);
  const editFormRef = useRef<ColorFormRef>(null);

  const editingColor = props.colors.find((c) => c.id === props.editingId);

  return (
    <div className="mx-auto max-w-5xl">
      <PaletteHeader onAdd={() => props.onToggleAddForm(true)} />
      {!props.showAddForm && props.colors.length === 0 && <EmptyPaletteState />}
      <PaletteGrid colors={props.colors} projectId={props.projectId} onDelete={props.onDelete} onEdit={props.onEdit} />
      <AddColorDrawer
        open={props.showAddForm}
        formRef={addFormRef}
        onClose={() => props.onToggleAddForm(false)}
        onSave={props.onAdd}
      />
      <EditColorDrawer
        open={!!editingColor}
        formRef={editFormRef}
        color={editingColor}
        onClose={() => props.onEdit(null)}
        onSave={props.onSave}
      />
    </div>
  );
}

function AddColorDrawer({ open, formRef, onClose, onSave }: {
  open: boolean;
  formRef: React.RefObject<ColorFormRef>;
  onClose: () => void;
  onSave: (values: Omit<ColorAsset, "id">) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} icon="palette" title="Add Color" confirmLabel="Add Color" onConfirm={() => formRef.current?.submit()}>
      <ColorForm ref={formRef} onSave={onSave} />
    </Drawer>
  );
}

function EditColorDrawer({ open, formRef, color, onClose, onSave }: {
  open: boolean;
  formRef: React.RefObject<ColorFormRef>;
  color: ColorAsset | undefined;
  onClose: () => void;
  onSave: (item: ColorAsset) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} icon="palette" title="Edit Color" confirmLabel="Save Changes" onConfirm={() => formRef.current?.submit()}>
      {color && <ColorForm ref={formRef} initial={color} onSave={(values) => onSave({ ...values, id: color.id })} />}
    </Drawer>
  );
}

function PaletteHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <header className="mb-lg flex items-center justify-between">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Palette</h1>
        <p className="text-ui-small text-outline">Manage your workspace color palette.</p>
      </div>
      <button
        onClick={onAdd}
        className="bg-primary text-on-primary text-ui-small rounded-md px-4 py-2 font-medium hover:opacity-90"
      >
        + Add Color
      </button>
    </header>
  );
}

function EmptyPaletteState() {
  return <p className="text-outline text-ui-small">No colors yet. Capture a website or add one manually.</p>;
}
