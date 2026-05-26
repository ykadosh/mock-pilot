import type { CSSProperties } from "react";

interface TypographyCardProps {
  typography: TypographyAsset;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function TypographyCard({ typography, onDelete, onEdit }: TypographyCardProps) {
  return (
    <div className="border-outline/20 bg-surface rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-on-surface mb-1 truncate" style={getTypographyPreviewStyle(typography)}>
            The quick brown fox jumps over the lazy dog
          </p>
          <p className="text-ui-small text-outline mt-1">
            {getTypographyLabel(typography)} · {typography.fontSize} · {typography.fontWeight}
            {typography.fontStyle !== "normal" && ` · ${typography.fontStyle}`}
          </p>
        </div>
        <div className="ml-4 flex gap-2">
          <button onClick={() => onEdit(typography.id)} className="text-ui-small text-outline hover:text-on-surface">
            Edit
          </button>
          <button onClick={() => onDelete(typography.id)} className="text-ui-small text-error hover:opacity-80">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function getTypographyPreviewStyle(typography: TypographyAsset): CSSProperties {
  return {
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    fontStyle: typography.fontStyle,
    lineHeight: typography.lineHeight,
    letterSpacing: typography.letterSpacing,
    textTransform: typography.textTransform as CSSProperties["textTransform"],
  };
}

function getTypographyLabel({ label, fontFamily }: TypographyAsset) {
  return label || fontFamily.split(",")[0].replace(/["']/g, "");
}
