interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteCardProps {
  color: ColorAsset;
  extras?: ColorAsset[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PaletteCard({ color, extras, onDelete, onEdit }: PaletteCardProps) {
  return (
    <div className="border-outline/20 bg-surface overflow-hidden rounded-lg border">
      <div className="border-outline/20 h-16 w-full border-b" style={{ backgroundColor: color.value }} />
      {extras && extras.length > 0 && (
        <div className="border-outline/20 flex h-6 w-full border-b">
          {extras.map((extra) => (
            <button
              key={extra.id}
              type="button"
              onClick={() => onEdit(extra.id)}
              title={`${extra.value}${extra.label ? ` – ${extra.label}` : ""}`}
              aria-label={`Edit ${extra.label || extra.value}`}
              className="hover:ring-on-surface/40 h-full flex-1 cursor-pointer hover:ring-2 hover:ring-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
              style={{ backgroundColor: extra.value }}
            />
          ))}
        </div>
      )}
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
