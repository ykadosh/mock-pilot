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

  const handleScan = useCallback(() => {
    if (!projectId || isAnalyzing) return;
    setIsAnalyzing(true);
  }, [projectId, isAnalyzing]);

  useRunComponentScan({ isAnalyzing, projectId, scanWebviewRef, persistComponents, setComponentsCss, setIsAnalyzing });

  return { components, componentsCss, editingId, setEditingId, handleDelete, handleRename, isAnalyzing, handleScan, scanWebviewRef };
}

interface RunScanOptions {
  isAnalyzing: boolean;
  projectId?: string;
  scanWebviewRef: React.MutableRefObject<Electron.WebviewTag | null>;
  persistComponents: (updated: ComponentAsset[], cssOverride?: string) => Promise<void>;
  setComponentsCss: (v: string) => void;
  setIsAnalyzing: (v: boolean) => void;
}

function useRunComponentScan({ isAnalyzing, projectId, scanWebviewRef, persistComponents, setComponentsCss, setIsAnalyzing }: RunScanOptions) {
  useEffect(() => {
    if (!isAnalyzing || !projectId) return;
    let cancelled = false;
    void (async () => {
      try {
        const webview = await waitForScanWebview(scanWebviewRef);
        if (cancelled || !webview) return;
        await waitForWebviewReady(webview);
        if (cancelled) return;
        const log = (...logArgs: unknown[]) => window.api.captureLog(...logArgs);
        const result = await extractComponents(webview, log);
        if (cancelled) return;
        const scanned = result.components.map(mapExtractedComponent);
        setComponentsCss(result.pageCss || "");
        await persistComponents(scanned, result.pageCss || "");
      } finally {
        if (!cancelled) setIsAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAnalyzing, projectId, scanWebviewRef, persistComponents, setComponentsCss, setIsAnalyzing]);
}

function waitForScanWebview(ref: React.MutableRefObject<Electron.WebviewTag | null>): Promise<Electron.WebviewTag | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (ref.current) return resolve(ref.current);
      if (Date.now() - start > 5000) return resolve(null);
      setTimeout(tick, 16);
    };
    tick();
  });
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
    let domReady = false;
    let stopped = false;
    const finish = () => { if (domReady && stopped) { cleanup(); resolve(); } };
    const onDom = () => { domReady = true; finish(); };
    const onStop = () => { stopped = true; finish(); };
    const cleanup = () => {
      webview.removeEventListener("dom-ready", onDom);
      webview.removeEventListener("did-stop-loading", onStop);
    };
    webview.addEventListener("dom-ready", onDom);
    webview.addEventListener("did-stop-loading", onStop);
  });
}
