import { SectionCard } from "../../components/ui/SectionCard";
import { formatProjectDate, formatProjectTime } from "./Settings.utils";

interface StorageValue {
  value: string;
  unit: string;
}

interface ProjectTechnicalInfoSectionProps {
  createdDate: Date | null;
  onCopyUrl: () => void;
  storage: StorageValue | null;
  url: string;
  urlCopied: boolean;
}

function SourceUrlField({ onCopyUrl, url, urlCopied }: Pick<ProjectTechnicalInfoSectionProps, "onCopyUrl" | "url" | "urlCopied">) {
  return (
    <div className="space-y-xs">
      <span className="text-label-caps font-label-caps text-outline block">Source URL</span>
      <div className="gap-xs font-code-block text-code-block text-on-surface bg-surface-container-lowest px-sm py-xs flex items-center overflow-hidden border border-[#334155]">
        <span className="flex-1 truncate">{url}</span>
        <span className="material-symbols-outlined hover:text-primary shrink-0 cursor-pointer text-sm" onClick={onCopyUrl} title={urlCopied ? "Copied!" : "Copy URL"}>
          {urlCopied ? "check" : "content_copy"}
        </span>
      </div>
    </div>
  );
}

function CreatedDateField({ createdDate }: Pick<ProjectTechnicalInfoSectionProps, "createdDate">) {
  return (
    <div className="space-y-xs">
      <span className="text-label-caps font-label-caps text-outline block">Date Created</span>
      {createdDate && (
        <>
          <div className="font-body-main text-on-surface">{formatProjectDate(createdDate)}</div>
          <div className="text-ui-small text-outline">{formatProjectTime(createdDate)}</div>
        </>
      )}
    </div>
  );
}

function StorageField({ storage }: Pick<ProjectTechnicalInfoSectionProps, "storage">) {
  return (
    <div className="space-y-xs">
      <span className="text-label-caps font-label-caps text-outline block">Storage Consumption</span>
      <div className="gap-xs flex items-end">
        <span className="font-headline-md text-headline-md text-on-surface">{storage?.value ?? "—"}</span>
        {storage && <span className="text-ui-small text-outline mb-0.5">{storage.unit}</span>}
      </div>
    </div>
  );
}

export function ProjectTechnicalInfoSection(props: ProjectTechnicalInfoSectionProps) {
  return (
    <SectionCard title="TECHNICAL INFORMATION" className="col-span-12">
      <div className="gap-lg grid grid-cols-1 md:grid-cols-3">
        <SourceUrlField onCopyUrl={props.onCopyUrl} url={props.url} urlCopied={props.urlCopied} />
        <CreatedDateField createdDate={props.createdDate} />
        <StorageField storage={props.storage} />
      </div>
    </SectionCard>
  );
}
