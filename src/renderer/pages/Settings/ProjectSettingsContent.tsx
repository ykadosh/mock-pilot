import type { ProjectMeta } from "./Settings.types";
import { ProjectActivitySection } from "./ProjectActivitySection";
import { ProjectDangerZoneSection } from "./ProjectDangerZoneSection";
import { ProjectNameSection } from "./ProjectNameSection";
import { ProjectTechnicalInfoSection } from "./ProjectTechnicalInfoSection";

interface StorageValue {
  value: string;
  unit: string;
}

interface ProjectSettingsContentProps {
  createdDate: Date | null;
  lastUpdated: Date | null;
  name: string;
  onCopyUrl: () => void;
  onDeleteRequest: () => void;
  onNameChange: (value: string) => void;
  onRename: () => void;
  project: ProjectMeta | null;
  storage: StorageValue | null;
  timeSinceUpdate: string | null;
  urlCopied: boolean;
}

export function ProjectSettingsContent({
  createdDate,
  lastUpdated,
  name,
  onCopyUrl,
  onDeleteRequest,
  onNameChange,
  onRename,
  project,
  storage,
  timeSinceUpdate,
  urlCopied,
}: ProjectSettingsContentProps) {
  if (!project) return <p className="text-body-main text-on-surface-variant">No project selected.</p>;

  return (
    <div className="gap-md grid grid-cols-12">
      <ProjectNameSection name={name} onChange={onNameChange} onSubmit={onRename} />
      <ProjectTechnicalInfoSection
        createdDate={createdDate}
        onCopyUrl={onCopyUrl}
        storage={storage}
        url={project.url}
        urlCopied={urlCopied}
      />
      <ProjectActivitySection lastUpdated={lastUpdated} timeSinceUpdate={timeSinceUpdate} />
      <ProjectDangerZoneSection onDelete={onDeleteRequest} />
    </div>
  );
}
