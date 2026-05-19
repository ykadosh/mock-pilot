import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { PageLayout } from "../components/layout/PageLayout";
import { SectionCard } from "../components/ui/SectionCard";

function ExportButton({
  onClick,
  disabled,
  icon,
  children,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-lg bg-primary-container/80 text-on-primary-container text-ui-small flex cursor-pointer items-center justify-center gap-2 py-2 font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {children}
    </button>
  );
}

type DevicePreset = "laptop" | "tablet" | "mobile";

const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number; icon: string; label: string }> = {
  laptop: { width: 1920, height: 1080, icon: "laptop", label: "Laptop" },
  tablet: { width: 768, height: 1024, icon: "tablet_android", label: "Tablet" },
  mobile: { width: 390, height: 844, icon: "smartphone", label: "Mobile" },
};

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export function Export() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [device, setDevice] = useState<DevicePreset>("laptop");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);

  // Export status states
  const [filesExporting, setFilesExporting] = useState(false);
  const [filesResult, setFilesResult] = useState<string | null>(null);
  const [imageExporting, setImageExporting] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [assetsBasePath, setAssetsBasePath] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    window.api.listProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    });
    window.api.loadProject(projectId).then((result) => {
      if (result.success && result.html) setHtml(result.html);
      if (result.success && result.assetsBasePath) setAssetsBasePath(result.assetsBasePath);
    });
  }, [projectId]);

  // Sync custom dimensions when device preset changes
  useEffect(() => {
    const size = DEVICE_SIZES[device];
    setCustomWidth(size.width);
    setCustomHeight(size.height);
  }, [device]);

  // Extract CSS for file size display
  const { cssSize, htmlSize, extractedCss } = useMemo(() => {
    if (!html) return { cssSize: 0, htmlSize: 0, extractedCss: "" };
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let css = "";
    let match: RegExpExecArray | null;
    while ((match = styleRegex.exec(html)) !== null) {
      css += match[1].trim() + "\n\n";
    }
    const htmlBytes = new Blob([html]).size;
    const cssBytes = new Blob([css]).size;
    return { cssSize: cssBytes, htmlSize: htmlBytes, extractedCss: css.trim() };
  }, [html]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  // Clean HTML for preview: strip scripts and resolve relative URLs
  const previewHtml = useMemo(() => {
    if (!html) return "";
    let cleaned = html;
    // Strip scripts and noscript
    cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    cleaned = cleaned.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "");
    // Resolve relative URLs using the project's original URL
    if (project?.url) {
      try {
        const origin = new URL(project.url).origin;
        cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/\//gi, `$1https://`);
        cleaned = cleaned.replace(/((?:src|href|action|poster|data)\s*=\s*["'])\/(?!\/)/gi, `$1${origin}/`);
        cleaned = cleaned.replace(/(url\(\s*['"]?)\/\//gi, `$1https://`);
        cleaned = cleaned.replace(/(url\(\s*['"]?)\/(?!\/)/gi, `$1${origin}/`);
      } catch { /* skip */ }
    }
    // Inject <base> tag for asset resolution
    if (assetsBasePath) {
      const baseTag = `<base href="${assetsBasePath}">`;
      cleaned = cleaned.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
    }
    return cleaned;
  }, [html, project?.url, assetsBasePath]);

  const handleExportFiles = async () => {
    if (!projectId || !html) return;
    setFilesExporting(true);
    setFilesResult(null);
    try {
      const result = await window.api.exportSaveFiles({ projectId, html, baseUrl: project?.url });
      if (result.success) {
        setFilesResult(`Exported to ${result.path}`);
      } else if (result.error !== "cancelled") {
        setFilesResult(`Error: ${result.error}`);
      }
    } catch {
      setFilesResult("Export failed");
    }
    setFilesExporting(false);
  };

  const handleExportImage = async () => {
    if (!html) return;
    setImageExporting(true);
    setImageResult(null);
    try {
      const result = await window.api.exportAsImage({
        html,
        width: customWidth,
        height: customHeight,
        baseUrl: project?.url,
        projectId,
      });
      if (result.success) {
        setImageResult(`Saved to ${result.path}`);
      } else if (result.error !== "cancelled") {
        setImageResult(`Error: ${result.error}`);
      }
    } catch {
      setImageResult("Export failed");
    }
    setImageExporting(false);
  };

  const handleDeployCodesandbox = async () => {
    if (!html) return;
    setDeploying("codesandbox");
    setDeployUrl(null);
    setDeployError(null);
    try {
      const result = await window.api.deployToCodesandbox({
        html,
        css: extractedCss || undefined,
        baseUrl: project?.url,
      });
      if (result.success) {
        setDeployUrl("codesandbox");
      } else {
        setDeployError(result.error || "Deploy failed");
      }
    } catch {
      setDeployError("Deploy failed");
    }
    setDeploying(null);
  };

  const handleDeployStackblitz = async () => {
    if (!html) return;
    setDeploying("stackblitz");
    setDeployUrl(null);
    setDeployError(null);
    try {
      const result = await window.api.deployToStackblitz({
        html,
        css: extractedCss || undefined,
        baseUrl: project?.url,
      });
      if (result.success) {
        setDeployUrl("stackblitz");
      } else {
        setDeployError(result.error || "Deploy failed");
      }
    } catch {
      setDeployError("Deploy failed");
    }
    setDeploying(null);
  };

  const handleCopyUrl = () => {
    if (!deployUrl) return;
    navigator.clipboard.writeText(deployUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopNav activeTab="export" projectId={projectId} />
      <div className="flex min-h-0 flex-1">
        <PageLayout
          title="Export Project"
          subtitle={`Configure and generate production-ready assets from ${project?.title || "Project Alpha"}.`}
        >
          {!html ? (
            <p className="text-body-main text-on-surface-variant">
              {!projectId ? "No project selected." : "Loading project…"}
            </p>
          ) : (
            <div className="gap-md grid grid-cols-1 lg:grid-cols-12">
              {/* Section 1: Files Export */}
              <SectionCard title="FILES" className="flex flex-col justify-between lg:col-span-4">
                <div>
                  <p className="text-body-main text-on-surface-variant mb-lg leading-relaxed">
                    Generate a production-ready package containing compiled HTML5, modular CSS, and optimized asset links.
                  </p>
                  <div className="space-y-sm mb-lg">
                    <div className="p-sm bg-surface-container-lowest flex items-center justify-between border border-[#334155]">
                      <div className="gap-sm flex items-center">
                        <span className="material-symbols-outlined text-outline text-[16px]">html</span>
                        <span className="text-ui-small font-code-block">index.html</span>
                      </div>
                      <span className="text-outline font-mono text-[10px]">{formatSize(htmlSize)}</span>
                    </div>
                    {cssSize > 0 && (
                      <div className="p-sm bg-surface-container-lowest flex items-center justify-between border border-[#334155]">
                        <div className="gap-sm flex items-center">
                          <span className="material-symbols-outlined text-outline text-[16px]">css</span>
                          <span className="text-ui-small font-code-block">styles.css</span>
                        </div>
                        <span className="text-outline font-mono text-[10px]">{formatSize(cssSize)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <ExportButton
                    onClick={handleExportFiles}
                    disabled={filesExporting}
                    icon="download_for_offline"
                    className="w-full"
                  >
                    {filesExporting ? "Exporting…" : "Download ZIP"}
                  </ExportButton>
                  {filesResult && (
                    <p className="text-outline mt-sm truncate text-center text-[10px]">{filesResult}</p>
                  )}
                </div>
              </SectionCard>

              {/* Section 2: Image Render */}
              <SectionCard title="IMAGE RENDER" className="lg:col-span-8">
                <div className="gap-lg grid h-[calc(100%-2rem)] grid-cols-1 md:grid-cols-2">
                  <div className="space-y-lg">
                    <div>
                      <span className="text-ui-small text-outline mb-sm block uppercase">DEVICE PRESETS</span>
                      <div className="gap-xs grid grid-cols-3">
                        {(Object.entries(DEVICE_SIZES) as [DevicePreset, typeof DEVICE_SIZES[DevicePreset]][]).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => setDevice(key)}
                            className={`flex cursor-pointer flex-col items-center justify-center border py-4 transition-all ${
                              device === key
                                ? "bg-primary-container/10 text-primary border-[#7C3AED]"
                                : "hover:border-outline text-outline border-[#334155]"
                            }`}
                          >
                            <span className="material-symbols-outlined mb-1">{preset.icon}</span>
                            <span className="text-[10px] font-bold">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-ui-small text-outline mb-sm block uppercase">CUSTOM DIMENSIONS</span>
                      <div className="gap-sm flex">
                        <div className="flex-1">
                          <label className="text-outline mb-1 block text-[10px] uppercase">Width (px)</label>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                            className="bg-surface-container-lowest text-ui-small focus:ring-primary text-on-surface w-full border border-[#334155] p-2 focus:ring-1 focus:outline-none"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-outline mb-1 block text-[10px] uppercase">Height (px)</label>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                            className="bg-surface-container-lowest text-ui-small focus:ring-primary text-on-surface w-full border border-[#334155] p-2 focus:ring-1 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <ExportButton
                      onClick={handleExportImage}
                      disabled={imageExporting}
                      icon="photo_camera"
                      className="w-full"
                    >
                      {imageExporting ? "Rendering…" : "Export as PNG"}
                    </ExportButton>
                    {imageResult && (
                      <p className="text-outline truncate text-center text-[10px]">{imageResult}</p>
                    )}
                  </div>

                  {/* Preview thumbnail */}
                  <div
                    ref={previewContainerRef}
                    className="group bg-surface-container-lowest mt-lg relative flex min-h-[200px] cursor-pointer items-start justify-center overflow-hidden border border-[#334155]"
                    onClick={() => html && setShowPreview(true)}
                  >
                    {showPreview && previewHtml ? (
                      <iframe
                        srcDoc={previewHtml}
                        className="pointer-events-none absolute border-0"
                        sandbox="allow-same-origin"
                        style={{
                          width: `${customWidth}px`,
                          height: `${customHeight}px`,
                          transform: `scale(${Math.max(
                            (previewContainerRef.current?.offsetWidth ?? 300) / customWidth,
                            (previewContainerRef.current?.offsetHeight ?? 200) / customHeight
                          )})`,
                          transformOrigin: "top center",
                        }}
                      />
                    ) : (
                      <>
                        <div className="from-surface-container-lowest to-surface-container absolute inset-0 bg-gradient-to-br opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="border-outline/20 flex items-center gap-2 border bg-[#0F172A]/80 px-3 py-1.5 backdrop-blur-sm">
                            <span className="material-symbols-outlined text-primary text-[16px]">zoom_in</span>
                            <span className="text-on-surface text-[10px] font-bold tracking-widest uppercase">Preview Render</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Section 3: Open in Browser */}
              <SectionCard className="gap-md flex flex-col items-center justify-between md:flex-row lg:col-span-12">
                <div className="gap-lg flex min-w-0 flex-1 items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#334155]">
                    <span className="material-symbols-outlined text-secondary text-2xl">open_in_browser</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-label-caps text-label-caps text-secondary">OPEN IN BROWSER</h2>
                    <p className="text-ui-small text-on-surface-variant">
                      Open the latest saved revision of this project directly in your default browser.
                    </p>
                  </div>
                </div>
                <div className="gap-sm flex shrink-0">
                  <ExportButton
                    onClick={() => projectId && window.api.openProjectInBrowser(projectId)}
                    icon="open_in_browser"
                  >
                    Open in Browser
                  </ExportButton>
                </div>
              </SectionCard>

              {/* Section 4: Deployment */}
              <SectionCard className="gap-md flex flex-col items-center justify-between md:flex-row lg:col-span-12">
                <div className="gap-lg flex min-w-0 flex-1 items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#334155]">
                    <span className="material-symbols-outlined text-secondary text-2xl">cloud_sync</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-label-caps text-label-caps text-secondary">DEPLOYMENT</h2>
                    <p className="text-ui-small text-on-surface-variant">
                      Push your latest build directly to external platforms for collaborative editing or live staging.
                    </p>
                  </div>
                </div>
                <div className="gap-sm flex shrink-0">
                  <ExportButton
                    onClick={handleDeployCodesandbox}
                    disabled={!!deploying}
                    icon="rocket_launch"
                  >
                    {deploying === "codesandbox" ? "Deploying…" : "Deploy to CodeSandbox"}
                  </ExportButton>
                  <ExportButton
                    onClick={handleDeployStackblitz}
                    disabled={!!deploying}
                    icon="rocket_launch"
                  >
                    {deploying === "stackblitz" ? "Deploying…" : "Deploy to StackBlitz"}
                  </ExportButton>
                </div>
              </SectionCard>

              {/* Deploy Status */}
              <section className={`bg-surface-container-low p-sm border lg:col-span-12 ${deployError ? 'border-error/20' : 'border-[#334155]'}`}>
                <div className="gap-md flex items-center">
                  <span className={`font-mono text-[10px] tracking-widest uppercase ${deployError ? 'text-error' : 'text-outline'}`}>Deploy Status</span>
                  {deploying ? (
                    <span className="text-on-surface font-mono text-[10px]">Deploying to {deploying === "codesandbox" ? "CodeSandbox" : "StackBlitz"}…</span>
                  ) : deployError ? (
                    <span className="text-on-surface font-mono text-[10px]">{deployError}</span>
                  ) : deployUrl ? (
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <span className="text-on-surface font-mono text-[10px]">Opened in {deployUrl === "codesandbox" ? "CodeSandbox" : "StackBlitz"}</span>
                    </div>
                  ) : (
                    <span className="text-outline font-mono text-[10px]">Deploy to CodeSandbox or StackBlitz to publish</span>
                  )}
                </div>
              </section>
            </div>
          )}
        </PageLayout>
      </div>
    </div>
  );
}
