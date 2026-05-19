import { useCallback, useEffect, useState } from "react";

type TypographyFormValues = Omit<TypographyAsset, "id">;

const EMPTY_ASSETS: ProjectAssets = { typography: [], colors: [] };

export function useTypographyAssets(projectId?: string) {
  const [typography, setTypography] = useState<TypographyAsset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const persistTypography = useCallback(async (updated: TypographyAsset[]) => {
    if (!projectId) return;
    setTypography(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : EMPTY_ASSETS;
    await window.api.saveProjectAssets(projectId, { ...assets, typography: updated });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const result = await window.api.loadProjectAssets(projectId);
      if (result.success && result.assets) setTypography(result.assets.typography || []);
    })();
  }, [projectId]);

  const handleDelete = useCallback((id: string) => {
    void persistTypography(typography.filter((item) => item.id !== id));
  }, [persistTypography, typography]);

  const handleSave = useCallback((item: TypographyAsset) => {
    void persistTypography(typography.map((existing) => existing.id === item.id ? item : existing));
    setEditingId(null);
  }, [persistTypography, typography]);

  const handleAdd = useCallback((item: TypographyFormValues) => {
    void persistTypography([...typography, { ...item, id: `typo-${Date.now()}` }]);
    setShowAddForm(false);
  }, [persistTypography, typography]);

  return { typography, editingId, showAddForm, setEditingId, setShowAddForm, handleAdd, handleDelete, handleSave };
}
