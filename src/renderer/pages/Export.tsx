import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";

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
  const previewContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectId) return;
    window.api.listProjects().then((projects) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) setProject(found);
    });
    window.api.loadProject(projectId).then((result) => {
      if (result.success && result.html) setHtml(result.html);
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
    return cleaned;
  }, [html, project?.url]);

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
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav activeTab="export" projectId={projectId} />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 bg-background overflow-y-auto p-lg">
          <header className="mb-lg max-w-5xl mx-auto">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
              Export Project
            </h1>
            <p className="text-ui-small text-outline">
              Configure and generate production-ready assets from {project?.title || "Project Alpha"}.
            </p>
          </header>

          {!html ? (
            <p className="text-body-main text-on-surface-variant max-w-5xl mx-auto">
              {!projectId ? "No project selected." : "Loading project…"}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-md max-w-5xl mx-auto">
              {/* Section 1: Files Export */}
              <section className="lg:col-span-4 bg-surface-container border border-[#334155] p-md flex flex-col justify-between">
                <div>
                  <h2 className="font-label-caps text-label-caps text-secondary mb-md">1. FILES</h2>
                  <p className="text-body-main text-on-surface-variant mb-lg leading-relaxed">
                    Generate a production-ready package containing compiled HTML5, modular CSS, and optimized asset links.
                  </p>
                  <div className="space-y-sm mb-lg">
                    <div className="flex items-center justify-between p-sm bg-surface-container-lowest border border-[#334155]">
                      <div className="flex items-center gap-sm">
                        <span className="material-symbols-outlined text-outline text-[16px]">html</span>
                        <span className="text-ui-small font-code-block">index.html</span>
                      </div>
                      <span className="text-[10px] text-outline font-mono">{formatSize(htmlSize)}</span>
                    </div>
                    {cssSize > 0 && (
                      <div className="flex items-center justify-between p-sm bg-surface-container-lowest border border-[#334155]">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-outline text-[16px]">css</span>
                          <span className="text-ui-small font-code-block">styles.css</span>
                        </div>
                        <span className="text-[10px] text-outline font-mono">{formatSize(cssSize)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleExportFiles}
                    disabled={filesExporting}
                    className="w-full py-2 bg-transparent border border-outline hover:bg-surface-container-highest text-on-surface text-ui-small flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
                    {filesExporting ? "Exporting…" : "Download ZIP"}
                  </button>
                  {filesResult && (
                    <p className="text-[10px] text-outline mt-sm text-center truncate">{filesResult}</p>
                  )}
                </div>
              </section>

              {/* Section 2: Image Render */}
              <section className="lg:col-span-8 bg-surface-container border border-[#334155] p-md">
                <h2 className="font-label-caps text-label-caps text-secondary mb-md">2. IMAGE RENDER</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg h-[calc(100%-2rem)]">
                  <div className="space-y-lg">
                    <div>
                      <span className="text-ui-small text-outline block mb-sm uppercase">DEVICE PRESETS</span>
                      <div className="grid grid-cols-3 gap-xs">
                        {(Object.entries(DEVICE_SIZES) as [DevicePreset, typeof DEVICE_SIZES[DevicePreset]][]).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => setDevice(key)}
                            className={`flex flex-col items-center justify-center py-4 border transition-all cursor-pointer ${
                              device === key
                                ? "border-[#7C3AED] bg-primary-container/10 text-primary"
                                : "border-[#334155] hover:border-outline text-outline"
                            }`}
                          >
                            <span className="material-symbols-outlined mb-1">{preset.icon}</span>
                            <span className="text-[10px] font-bold">{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-ui-small text-outline block mb-sm uppercase">CUSTOM DIMENSIONS</span>
                      <div className="flex gap-sm">
                        <div className="flex-1">
                          <label className="text-[10px] text-outline block uppercase mb-1">Width (px)</label>
                          <input
                            type="number"
                            value={customWidth}
                            onChange={(e) => setCustomWidth(Number(e.target.value) || 0)}
                            className="w-full bg-surface-container-lowest border border-[#334155] text-ui-small p-2 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-outline block uppercase mb-1">Height (px)</label>
                          <input
                            type="number"
                            value={customHeight}
                            onChange={(e) => setCustomHeight(Number(e.target.value) || 0)}
                            className="w-full bg-surface-container-lowest border border-[#334155] text-ui-small p-2 focus:ring-1 focus:ring-primary focus:outline-none text-on-surface"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleExportImage}
                      disabled={imageExporting}
                      className="w-full py-2 bg-primary-container text-on-primary-container text-ui-small font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      {imageExporting ? "Rendering…" : "Export as PNG"}
                    </button>
                    {imageResult && (
                      <p className="text-[10px] text-outline text-center truncate">{imageResult}</p>
                    )}
                  </div>

                  {/* Preview thumbnail */}
                  <div
                    ref={previewContainerRef}
                    className="relative group bg-surface-container-lowest border border-[#334155] overflow-hidden flex items-start justify-center cursor-pointer min-h-[200px] mt-lg"
                    onClick={() => html && setShowPreview(true)}
                  >
                    {showPreview && previewHtml ? (
                      <iframe
                        srcDoc={previewHtml}
                        className="absolute border-0 pointer-events-none"
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
                        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-[#0F172A]/80 backdrop-blur-sm border border-outline/20 px-3 py-1.5 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-primary">zoom_in</span>
                            <span className="text-[10px] font-bold text-on-surface tracking-widest uppercase">Preview Render</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 3: Deployment */}
              <section className="lg:col-span-12 bg-surface-container border border-[#334155] p-md flex flex-col md:flex-row items-center justify-between gap-md">
                <div className="flex items-center gap-lg min-w-0 flex-1">
                  <div className="w-12 h-12 bg-[#334155] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-2xl">cloud_sync</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-label-caps text-label-caps text-secondary">3. DEPLOYMENT</h2>
                    <p className="text-ui-small text-on-surface-variant">
                      Push your latest build directly to external platforms for collaborative editing or live staging.
                    </p>
                  </div>
                </div>
                <div className="flex gap-sm shrink-0">
                  <button
                    onClick={handleDeployCodesandbox}
                    disabled={!!deploying}
                    className="flex-1 md:flex-none px-lg py-3 bg-[#151515] border border-white/10 hover:border-white/20 text-white text-ui-small font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    {deploying === "codesandbox" ? "Deploying…" : "Deploy to CodeSandbox"}
                  </button>
                  <button
                    onClick={handleDeployStackblitz}
                    disabled={!!deploying}
                    className="flex-1 md:flex-none px-lg py-3 bg-transparent border border-[#334155] hover:bg-surface-container-highest text-on-surface text-ui-small flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    {deploying === "stackblitz" ? "Deploying…" : "Open in StackBlitz"}
                  </button>
                </div>
              </section>

              {/* Deploy Status */}
              <section className={`lg:col-span-12 bg-surface-container-low border p-sm ${deployError ? 'border-error/20' : 'border-[#334155]'}`}>
                <div className="flex items-center gap-md">
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${deployError ? 'text-error' : 'text-outline'}`}>Deploy Status</span>
                  {deploying ? (
                    <span className="text-[10px] font-mono text-on-surface">Deploying to {deploying === "codesandbox" ? "CodeSandbox" : "StackBlitz"}…</span>
                  ) : deployError ? (
                    <span className="text-[10px] font-mono text-on-surface">{deployError}</span>
                  ) : deployUrl ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <span className="text-[10px] font-mono text-on-surface">Opened in {deployUrl === "codesandbox" ? "CodeSandbox" : "StackBlitz"}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-outline">Deploy to CodeSandbox or StackBlitz to publish</span>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
