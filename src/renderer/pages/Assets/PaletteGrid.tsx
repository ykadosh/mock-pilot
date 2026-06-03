import { useMemo } from "react";

import { PaletteCard } from "./PaletteCard";
import { groupSimilarColors } from "./colorGrouping";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

interface PaletteGridProps {
  colors: ColorAsset[];
  projectId: string | undefined;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function PaletteGrid({ colors, projectId, onDelete, onEdit }: PaletteGridProps) {
  const groups = useMemo(() => groupSimilarColors(colors), [colors]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {groups.map((group) => (
        <PaletteCard
          key={group.representative.id}
          color={group.representative}
          extras={group.members.slice(1)}
          projectId={projectId}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
