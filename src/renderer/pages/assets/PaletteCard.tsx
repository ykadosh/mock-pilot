import { ColorForm } from "./ColorForm";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteCardProps {
  color: ColorAsset;
  isEditing: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  onSave: (item: ColorAsset) => void;
}

export function PaletteCard({ color, isEditing, onDelete, onEdit, onSave }: PaletteCardProps) {
  return (
    <div className="border-outline/20 bg-surface overflow-hidden rounded-lg border">
      {isEditing ? (
        <PaletteCardEditor color={color} onCancel={() => onEdit(null)} onSave={onSave} />
      ) : (
        <PaletteCardPreview color={color} onDelete={onDelete} onEdit={onEdit} />
      )}
    </div>
  );
}

function PaletteCardEditor({
  color,
  onCancel,
  onSave,
}: {
  color: ColorAsset;
  onCancel: () => void;
  onSave: (item: ColorAsset) => void;
}) {
  return <ColorForm initial={color} onSave={(values) => onSave({ ...values, id: color.id })} onCancel={onCancel} />;
}

function PaletteCardPreview({
  color,
  onDelete,
  onEdit,
}: {
  color: ColorAsset;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
}) {
  return (
    <div>
      <div className="border-outline/20 h-16 w-full border-b" style={{ backgroundColor: color.value }} />
      <div className="p-2">
        <p className="text-ui-small text-on-surface truncate font-mono">{color.value}</p>
        {color.label && <p className="text-ui-small text-outline truncate">{color.label}</p>}
        <div className="mt-1 flex gap-2">
          <button onClick={() => onEdit(color.id)} className="text-ui-small text-outline hover:text-on-surface">Edit</button>
          <button onClick={() => onDelete(color.id)} className="text-ui-small text-error hover:opacity-80">Delete</button>
        </div>
      </div>
    </div>
  );
}
