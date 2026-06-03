import { PinAttachmentButton } from "../../components/PinAttachmentButton";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteCardProps {
  color: ColorAsset;
  extras?: ColorAsset[];
  projectId: string | undefined;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PaletteCard({ color, extras, projectId, onDelete, onEdit }: PaletteCardProps) {
  const hasExtras = !!extras && extras.length > 0;
  return (
    <div className="border-outline/20 bg-surface overflow-hidden rounded-lg border">
      <PaletteMainSwatch color={color} projectId={projectId} onEdit={onEdit} onDelete={onDelete} />
      <PaletteExtrasStrip color={color} extras={hasExtras ? extras! : undefined} onEdit={onEdit} />
      <div className="p-2">
        <p className="text-ui-small text-on-surface truncate font-mono">{color.value}</p>
        {color.label && <p className="text-ui-small text-outline truncate">{color.label}</p>}
      </div>
    </div>
  );
}

function PaletteMainSwatch({ color, projectId, onEdit, onDelete }: {
  color: ColorAsset;
  projectId: string | undefined;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onEdit(color.id)}
        aria-label={`Edit ${color.label || color.value}`}
        className="hover:ring-on-surface/40 block h-16 w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ backgroundColor: color.value }}
      />
      <div className="absolute top-1.5 left-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <PinAttachmentButton projectId={projectId} attachment={{ type: "color", id: color.id, label: color.label, value: color.value }} variant="overlay" className="!static" />
      </div>
      <button
        type="button"
        onClick={() => onDelete(color.id)}
        aria-label={`Delete ${color.label || color.value}`}
        title="Delete"
        className="border-outline/20 bg-surface/90 text-on-surface hover:text-error absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-sm"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
      </button>
    </div>
  );
}

function PaletteExtrasStrip({ color, extras, onEdit }: {
  color: ColorAsset;
  extras?: ColorAsset[];
  onEdit: (id: string) => void;
}) {
  return (
    <div className={`border-outline/20 flex h-6 w-full border-b ${extras ? "border-t" : ""}`}>
      {extras ? (
        extras.map((extra) => (
          <button
            key={extra.id}
            type="button"
            onClick={() => onEdit(extra.id)}
            title={`${extra.value}${extra.label ? ` – ${extra.label}` : ""}`}
            aria-label={`Edit ${extra.label || extra.value}`}
            className="hover:ring-on-surface/40 h-full flex-1 cursor-pointer hover:ring-2 hover:ring-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
            style={{ backgroundColor: extra.value }}
          />
        ))
      ) : (
        <div className="h-full w-full" style={{ backgroundColor: color.value }} />
      )}
    </div>
  );
}
