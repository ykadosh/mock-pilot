import { SectionCard } from "../../components/ui/SectionCard";
import { ExportButton } from "./ExportButton";

interface ExportFilesSectionProps {
  cssSize: number;
  htmlSize: number;
  filesExporting: boolean;
  filesResult: string | null;
  formatSize: (bytes: number) => string;
  onExportFiles: () => void;
}

export function ExportFilesSection(props: ExportFilesSectionProps) {
  const { cssSize, htmlSize, filesExporting, filesResult, formatSize, onExportFiles } = props;

  return (
    <SectionCard title="FILES" className="flex flex-col justify-between lg:col-span-4">
      <ExportedFilesList cssSize={cssSize} htmlSize={htmlSize} formatSize={formatSize} />
      <div>
        <ExportButton onClick={onExportFiles} disabled={filesExporting} icon="download_for_offline" className="w-full">
          {filesExporting ? "Exporting…" : "Download ZIP"}
        </ExportButton>
        {filesResult && <p className="text-outline mt-sm truncate text-center text-[10px]">{filesResult}</p>}
      </div>
    </SectionCard>
  );
}

function ExportedFilesList({ cssSize, htmlSize, formatSize }: Pick<ExportFilesSectionProps, "cssSize" | "htmlSize" | "formatSize">) {
  return (
    <div>
      <p className="text-body-main text-on-surface-variant mb-lg leading-relaxed">
        Generate a production-ready package containing compiled HTML5, modular CSS, and optimized asset links.
      </p>
      <div className="space-y-sm mb-lg">
        <FileRow icon="html" label="index.html" size={formatSize(htmlSize)} />
        {cssSize > 0 && <FileRow icon="css" label="styles.css" size={formatSize(cssSize)} />}
      </div>
    </div>
  );
}

function FileRow({ icon, label, size }: { icon: string; label: string; size: string }) {
  return (
    <div className="p-sm bg-surface-container-lowest flex items-center justify-between border border-[#334155]">
      <div className="gap-sm flex items-center">
        <span className="material-symbols-outlined text-outline text-2xl">{icon}</span>
        <span className="text-ui-small font-code-block">{label}</span>
      </div>
      <span className="text-outline font-mono text-[10px]">{size}</span>
    </div>
  );
}
