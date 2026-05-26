import { PaletteCard } from "./PaletteCard";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteGridProps {
  colors: ColorAsset[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PaletteGrid({ colors, onDelete, onEdit }: PaletteGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {colors.map((color) => (
        <PaletteCard
          key={color.id}
          color={color}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
