import { ColorForm } from "./ColorForm";
import { PaletteGrid } from "./PaletteGrid";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PalettePageContentProps {
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
  return (
    <div className="mx-auto max-w-5xl">
      <PaletteHeader onAdd={() => props.onToggleAddForm(true)} />
      {props.showAddForm && <ColorForm onSave={props.onAdd} onCancel={() => props.onToggleAddForm(false)} />}
      {!props.showAddForm && props.colors.length === 0 && <EmptyPaletteState />}
      <PaletteGrid
        colors={props.colors}
        editingId={props.editingId}
        onDelete={props.onDelete}
        onEdit={props.onEdit}
        onSave={props.onSave}
      />
    </div>
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
