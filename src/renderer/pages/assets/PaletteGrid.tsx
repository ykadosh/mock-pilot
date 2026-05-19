import { PaletteCard } from "./PaletteCard";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteGridProps {
  colors: ColorAsset[];
  editingId: string | null;
  onDelete: (id: string) => void;
  onEdit: (id: string | null) => void;
  onSave: (item: ColorAsset) => void;
}

export function PaletteGrid({ colors, editingId, onDelete, onEdit, onSave }: PaletteGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {colors.map((color) => (
        <PaletteCard
          key={color.id}
          color={color}
          isEditing={editingId === color.id}
          onDelete={onDelete}
          onEdit={onEdit}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
