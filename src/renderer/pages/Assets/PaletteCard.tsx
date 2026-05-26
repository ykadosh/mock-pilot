interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteCardProps {
  color: ColorAsset;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PaletteCard({ color, onDelete, onEdit }: PaletteCardProps) {
  return (
    <div className="border-outline/20 bg-surface overflow-hidden rounded-lg border">
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
