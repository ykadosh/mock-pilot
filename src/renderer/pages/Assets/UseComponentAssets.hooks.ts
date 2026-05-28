import { useCallback, useEffect, useRef, useState } from "react";
import { extractComponents } from "../CaptureBrowser/extractComponents";

interface ComponentProp {
  name: string;
  type: string;
  description: string;
}

interface ComponentAsset {
  id: string;
  label: string;
  html: string;
  count: number;
  hash: string;
  description?: string;
  props?: ComponentProp[];
}

const EMPTY_ASSETS = { typography: [], colors: [], components: [] };

export function useComponentAssets(projectId?: string) {
  const [components, setComponents] = useState<ComponentAsset[]>([]);
  const [componentsCss, setComponentsCss] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scanWebviewRef = useRef<Electron.WebviewTag | null>(null);

  const persistComponents = useCallback(async (updated: ComponentAsset[], cssOverride?: string) => {
    if (!projectId) return;
    setComponents(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : EMPTY_ASSETS;
    const nextCss = cssOverride ?? (assets as { componentsCss?: string }).componentsCss;
    await window.api.saveProjectAssets(projectId, { ...assets, components: updated, componentsCss: nextCss });
  }, [projectId]);

  useLoadComponentAssets(projectId, setComponents, setComponentsCss);

  const handleDelete = useCallback((id: string) => {
    void persistComponents(components.filter((item) => item.id !== id));
  }, [persistComponents, components]);

  const handleRename = useCallback((id: string, newLabel: string) => {
    void persistComponents(components.map((item) => item.id === id ? { ...item, label: newLabel } : item));
    setEditingId(null);
  }, [persistComponents, components]);

  const handleScan = useCallback(async () => {
    if (!projectId || isAnalyzing) return;
    const webview = scanWebviewRef.current;
    if (!webview) return;
    setIsAnalyzing(true);
    try {
      const result = await runComponentScan(webview);
      const scanned = result.components.map(mapExtractedComponent);
      setComponentsCss(result.pageCss || "");
      await persistComponents(scanned, result.pageCss || "");
    } finally {
      setIsAnalyzing(false);
    }
  }, [projectId, isAnalyzing, persistComponents]);

  return { components, componentsCss, editingId, setEditingId, handleDelete, handleRename, isAnalyzing, handleScan, scanWebviewRef };
}

function useLoadComponentAssets(projectId: string | undefined, setComponents: (v: ComponentAsset[]) => void, setComponentsCss: (v: string) => void) {
  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const result = await window.api.loadProjectAssets(projectId);
      if (result.success && result.assets) {
        setComponents(result.assets.components || []);
        setComponentsCss(result.assets.componentsCss || "");
      }
    })();
  }, [projectId, setComponents, setComponentsCss]);
}

async function runComponentScan(webview: Electron.WebviewTag) {
  await waitForWebviewReady(webview);
  const log = (...logArgs: unknown[]) => window.api.captureLog(...logArgs);
  return extractComponents(webview, log);
}

function mapExtractedComponent(component: { label: string; html: string; count: number; hash: string; description?: string; props?: ComponentProp[] }, index: number): ComponentAsset {
  return {
    id: `comp-${index}`,
    label: component.label,
    html: component.html,
    count: component.count,
    hash: component.hash,
    description: component.description,
    props: component.props,
  };
}

function waitForWebviewReady(webview: Electron.WebviewTag): Promise<void> {
  return new Promise((resolve) => {
    if (!webview.isLoading?.()) return resolve();
    const onReady = () => {
      webview.removeEventListener("did-stop-loading", onReady);
      resolve();
    };
    webview.addEventListener("did-stop-loading", onReady);
  });
}
