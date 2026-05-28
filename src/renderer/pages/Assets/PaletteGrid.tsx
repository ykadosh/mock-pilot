import { useMemo, useState } from "react";

import { PaletteCard } from "./PaletteCard";
import { groupSimilarColors, type ColorGroup } from "./colorGrouping";

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
  const groups = useMemo(() => groupSimilarColors(colors), [colors]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {groups.map((group) => (
        <PaletteGroupCell
          key={group.representative.id}
          group={group}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function PaletteGroupCell({ group, onDelete, onEdit }: {
  group: ColorGroup;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const extras = group.members.length - 1;
  const hasExtras = extras > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <PaletteCard color={group.representative} onDelete={onDelete} onEdit={onEdit} />
        {hasExtras && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse similar colors" : `Show ${extras} similar color${extras === 1 ? "" : "s"}`}
            className="border-outline/20 bg-surface text-on-surface text-ui-small hover:bg-surface-variant/40 absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono"
          >
            <span>+{extras}</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {expanded ? "expand_less" : "expand_more"}
            </span>
          </button>
        )}
      </div>
      {hasExtras && expanded && (
        <div className="border-outline/20 ml-2 flex flex-col gap-2 border-l pl-2">
          {group.members.slice(1).map((color) => (
            <PaletteCard key={color.id} color={color} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
