import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { PageLayout } from "../../components/layout/PageLayout";
import { TopNav } from "../../components/layout/TopNav";
import { ExportActionsSection } from "./ExportActionsSection";
import { useDeployActions, useFileExport, useImageExport, useImageExportSettings, useProjectExportData } from "./Export.hooks";
import { ExportFilesSection } from "./ExportFilesSection";
import { ExportImageSection } from "./ExportImageSection";
import { buildPreviewHtml, extractExportMetrics, formatSize } from "./Export.utils";

export function Export() {
  const { projectId } = useParams<{ projectId: string }>();
  const { project, html, assetsBasePath } = useProjectExportData(projectId);
  const imageSettings = useImageExportSettings();
  const exportMetrics = useMemo(() => extractExportMetrics(html), [html]);
  const previewHtml = useMemo(() => buildPreviewHtml(html, project?.url, assetsBasePath), [assetsBasePath, html, project?.url]);
  const fileExport = useFileExport(projectId, html, project?.url);
  const imageExport = useImageExport(projectId, html, project?.url);
  const deployActions = useDeployActions(html, exportMetrics.extractedCss, project?.url);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav activeTab="export" projectId={projectId} />
      <div className="flex min-h-0 flex-1">
        <PageLayout title="Export Project" subtitle={`Configure and generate production-ready assets from ${project?.title || "Project Alpha"}.`}>
          <ExportContent
            html={html}
            previewHtml={previewHtml}
            projectId={projectId}
            formatSize={formatSize}
            exportMetrics={exportMetrics}
            fileExport={fileExport}
            imageExport={imageExport}
            imageSettings={imageSettings}
            deployActions={deployActions}
          />
        </PageLayout>
      </div>
    </div>
  );
}

function ExportContent(props: {
  deployActions: ReturnType<typeof useDeployActions>;
  exportMetrics: ReturnType<typeof extractExportMetrics>;
  fileExport: ReturnType<typeof useFileExport>;
  formatSize: typeof formatSize;
  html: string | null;
  imageExport: ReturnType<typeof useImageExport>;
  imageSettings: ReturnType<typeof useImageExportSettings>;
  projectId?: string;
  previewHtml: string;
}) {
  if (!props.html) {
    return <LoadingMessage projectId={props.projectId} />;
  }

  return <LoadedExportContent {...props} />;
}

function LoadingMessage({ projectId }: { projectId?: string }) {
  return <p className="text-body-main text-on-surface-variant">{!projectId ? "No project selected." : "Loading project…"}</p>;
}

function LoadedExportContent({ deployActions, exportMetrics, fileExport, formatSize, imageExport, imageSettings, projectId, previewHtml }: {
  deployActions: ReturnType<typeof useDeployActions>;
  exportMetrics: ReturnType<typeof extractExportMetrics>;
  fileExport: ReturnType<typeof useFileExport>;
  formatSize: typeof formatSize;
  imageExport: ReturnType<typeof useImageExport>;
  imageSettings: ReturnType<typeof useImageExportSettings>;
  projectId?: string;
  previewHtml: string;
}) {
  return (
    <div className="gap-md grid grid-cols-1 lg:grid-cols-12">
      <ExportFilesSection cssSize={exportMetrics.cssSize} htmlSize={exportMetrics.htmlSize} filesExporting={fileExport.filesExporting} filesResult={fileExport.filesResult} formatSize={formatSize} onExportFiles={fileExport.handleExportFiles} />
      <ExportImageSection
        customHeight={imageSettings.customHeight}
        customWidth={imageSettings.customWidth}
        device={imageSettings.device}
        imageExporting={imageExport.imageExporting}
        imageResult={imageExport.imageResult}
        previewHtml={previewHtml}
        setCustomHeight={imageSettings.setCustomHeight}
        setCustomWidth={imageSettings.setCustomWidth}
        setDevice={imageSettings.setDevice}
        showPreview={imageSettings.showPreview}
        onExportImage={() => imageExport.handleExportImage(imageSettings.customWidth, imageSettings.customHeight)}
        onShowPreview={() => imageSettings.setShowPreview(true)}
      />
      <ExportActionsSection
        deployError={deployActions.deployError}
        deploying={deployActions.deploying}
        deployTarget={deployActions.deployTarget}
        onDeployCodesandbox={deployActions.deployToCodesandbox}
        onDeployStackblitz={deployActions.deployToStackblitz}
        onOpenInBrowser={() => projectId && window.api.openProjectInBrowser(projectId)}
      />
    </div>
  );
}
