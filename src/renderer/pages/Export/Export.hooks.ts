import { useCallback, useEffect, useState } from "react";
import { DEVICE_SIZES, type DeployTarget, type DevicePreset, type ProjectMeta } from "./Export.utils";

export function useProjectExportData(projectId?: string) {
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [assetsBasePath, setAssetsBasePath] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    window.api.listProjects().then((projects) => {
      const found = projects.find((entry) => entry.id === projectId);
      if (found) setProject(found);
    });

    window.api.loadProject(projectId).then((result) => {
      if (!result.success) return;
      if (result.html) setHtml(result.html);
      if (result.assetsBasePath) setAssetsBasePath(result.assetsBasePath);
    });
  }, [projectId]);

  return { project, html, assetsBasePath };
}

export function useImageExportSettings() {
  const [device, setDevice] = useState<DevicePreset>("laptop");
  const [customWidth, setCustomWidth] = useState(1280);
  const [customHeight, setCustomHeight] = useState(800);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const size = DEVICE_SIZES[device];
    setCustomWidth(size.width);
    setCustomHeight(size.height);
  }, [device]);

  return { device, setDevice, customWidth, setCustomWidth, customHeight, setCustomHeight, showPreview, setShowPreview };
}

export function useFileExport(projectId?: string, html?: string | null, projectUrl?: string) {
  const [filesExporting, setFilesExporting] = useState(false);
  const [filesResult, setFilesResult] = useState<string | null>(null);

  const handleExportFiles = useCallback(async () => {
    if (!projectId || !html) return;

    setFilesExporting(true);
    setFilesResult(null);
    try {
      const result = await window.api.exportSaveFiles({ projectId, html, baseUrl: projectUrl });
      if (result.success) setFilesResult(`Exported to ${result.path}`);
      else if (result.error !== "cancelled") setFilesResult(`Error: ${result.error}`);
    } catch {
      setFilesResult("Export failed");
    }
    setFilesExporting(false);
  }, [html, projectId, projectUrl]);

  return { filesExporting, filesResult, handleExportFiles };
}

export function useImageExport(projectId?: string, html?: string | null, projectUrl?: string) {
  const [imageExporting, setImageExporting] = useState(false);
  const [imageResult, setImageResult] = useState<string | null>(null);

  const handleExportImage = useCallback(async (width: number, height: number) => {
    if (!html) return;

    setImageExporting(true);
    setImageResult(null);
    try {
      const result = await window.api.exportAsImage({ html, width, height, baseUrl: projectUrl, projectId });
      if (result.success) setImageResult(`Saved to ${result.path}`);
      else if (result.error !== "cancelled") setImageResult(`Error: ${result.error}`);
    } catch {
      setImageResult("Export failed");
    }
    setImageExporting(false);
  }, [html, projectId, projectUrl]);

  return { imageExporting, imageResult, handleExportImage };
}

export function useDeployActions(html?: string | null, css?: string, projectUrl?: string) {
  const [deploying, setDeploying] = useState<DeployTarget | null>(null);
  const [deployTarget, setDeployTarget] = useState<DeployTarget | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const deploy = useCallback(async (target: DeployTarget) => {
    if (!html) return;

    setDeploying(target);
    setDeployTarget(null);
    setDeployError(null);
    try {
      const apiCall = target === "codesandbox" ? window.api.deployToCodesandbox : window.api.deployToStackblitz;
      const result = await apiCall({ html, css: css || undefined, baseUrl: projectUrl });
      if (result.success) setDeployTarget(target);
      else setDeployError(result.error || "Deploy failed");
    } catch {
      setDeployError("Deploy failed");
    }
    setDeploying(null);
  }, [css, html, projectUrl]);

  return { deploying, deployTarget, deployError, deployToCodesandbox: () => deploy("codesandbox"), deployToStackblitz: () => deploy("stackblitz") };
}
