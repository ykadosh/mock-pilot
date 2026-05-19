import { SectionCard } from "../../components/ui/SectionCard";

interface ProjectDangerZoneSectionProps {
  onDelete: () => void;
}

export function ProjectDangerZoneSection({ onDelete }: ProjectDangerZoneSectionProps) {
  return (
    <SectionCard title="DANGER ZONE" variant="danger" className="mt-lg col-span-12">
      <div className="gap-md flex flex-col justify-between md:flex-row md:items-center">
        <p className="font-body-main text-on-surface">
          Permanently remove this project and all its associated data. This action is irreversible.
        </p>
        <button
          onClick={onDelete}
          className="bg-error-container text-on-error-container px-lg py-sm text-ui-small hover:bg-error gap-sm flex shrink-0 cursor-pointer items-center font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-sm">delete_forever</span>
          Delete Project
        </button>
      </div>
    </SectionCard>
  );
}
