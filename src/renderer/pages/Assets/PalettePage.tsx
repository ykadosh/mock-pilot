import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

import { PalettePageContent } from "./PalettePageContent";

interface ColorAsset {
  id: string;
  label: string;
  value: string;
}

export function PalettePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [colors, setColors] = useState<ColorAsset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const loadAssets = useCallback(async () => {
    if (!projectId) return;
    const result = await window.api.loadProjectAssets(projectId);
    if (result.success && result.assets) setColors(result.assets.colors || []);
  }, [projectId]);

  useEffect(() => { void loadAssets(); }, [loadAssets]);

  const saveColors = async (updated: ColorAsset[]) => {
    if (!projectId) return;
    setColors(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : { typography: [], colors: [] };
    assets.colors = updated;
    await window.api.saveProjectAssets(projectId, assets);
  };

  return (
    <PalettePageContent
      projectId={projectId}
      colors={colors}
      editingId={editingId}
      showAddForm={showAddForm}
      onAdd={(item) => { void saveColors([...colors, { ...item, id: `color-${Date.now()}` }]); setShowAddForm(false); }}
      onDelete={(id) => { void saveColors(colors.filter((color) => color.id !== id)); }}
      onEdit={setEditingId}
      onSave={(item) => { void saveColors(colors.map((color) => (color.id === item.id ? item : color))); setEditingId(null); }}
      onToggleAddForm={setShowAddForm}
    />
  );
}
