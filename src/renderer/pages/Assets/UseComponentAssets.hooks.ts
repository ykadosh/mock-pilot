import { useCallback, useEffect, useState } from "react";

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

  const persistComponents = useCallback(async (updated: ComponentAsset[]) => {
    if (!projectId) return;
    setComponents(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : EMPTY_ASSETS;
    await window.api.saveProjectAssets(projectId, { ...assets, components: updated });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const result = await window.api.loadProjectAssets(projectId);
      if (result.success && result.assets) {
        setComponents(result.assets.components || []);
        setComponentsCss(result.assets.componentsCss || "");
      }
    })();
  }, [projectId]);

  const handleDelete = useCallback((id: string) => {
    void persistComponents(components.filter((item) => item.id !== id));
  }, [persistComponents, components]);

  const handleRename = useCallback((id: string, newLabel: string) => {
    void persistComponents(components.map((item) => item.id === id ? { ...item, label: newLabel } : item));
    setEditingId(null);
  }, [persistComponents, components]);

  return { components, componentsCss, editingId, setEditingId, handleDelete, handleRename, isAnalyzing, setIsAnalyzing };
}
