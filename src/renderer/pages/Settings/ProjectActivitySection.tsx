import { SectionCard } from "../../components/ui/SectionCard";
import { formatLastUpdated } from "./Settings.utils";

interface ProjectActivitySectionProps {
  lastUpdated: Date | null;
  timeSinceUpdate: string | null;
}

export function ProjectActivitySection({
  lastUpdated,
  timeSinceUpdate,
}: ProjectActivitySectionProps) {
  return (
    <SectionCard title="LAST ACTIVITY" className="col-span-12">
      <div className="gap-md flex items-center">
        <div className="text-on-surface-variant text-4xl font-bold opacity-20">{timeSinceUpdate ?? "—"}</div>
        <div className="font-body-main text-on-surface">
          <p>Last modified {lastUpdated ? formatLastUpdated(lastUpdated) : "never"}</p>
        </div>
      </div>
    </SectionCard>
  );
}
