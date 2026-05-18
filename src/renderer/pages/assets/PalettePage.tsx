import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

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
    if (result.success && result.assets) {
      setColors(result.assets.colors || []);
    }
  }, [projectId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const saveColors = async (updated: ColorAsset[]) => {
    if (!projectId) return;
    setColors(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : { typography: [], colors: [] };
    assets.colors = updated;
    await window.api.saveProjectAssets(projectId, assets);
  };

  const handleDelete = (id: string) => {
    saveColors(colors.filter(c => c.id !== id));
  };

  const handleSave = (item: ColorAsset) => {
    const updated = colors.map(c => c.id === item.id ? item : c);
    saveColors(updated);
    setEditingId(null);
  };

  const handleAdd = (item: Omit<ColorAsset, "id">) => {
    const newItem: ColorAsset = { ...item, id: "color-" + Date.now() };
    saveColors([...colors, newItem]);
    setShowAddForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-lg flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            Palette
          </h1>
          <p className="text-ui-small text-outline">
            Manage your workspace color palette.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-primary text-on-primary rounded-md text-ui-small font-medium hover:opacity-90"
        >
          + Add Color
        </button>
      </header>

      {showAddForm && (
        <ColorForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {colors.length === 0 && !showAddForm && (
        <p className="text-outline text-ui-small">No colors yet. Capture a website or add one manually.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {colors.map(c => (
          <div key={c.id} className="border border-outline/20 rounded-lg overflow-hidden bg-surface">
            {editingId === c.id ? (
              <ColorForm
                initial={c}
                onSave={(values) => handleSave({ ...values, id: c.id })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div>
                <div
                  className="w-full h-16 border-b border-outline/20"
                  style={{ backgroundColor: c.value }}
                />
                <div className="p-2">
                  <p className="text-ui-small text-on-surface font-mono truncate">{c.value}</p>
                  {c.label && <p className="text-ui-small text-outline truncate">{c.label}</p>}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setEditingId(c.id)}
                      className="text-ui-small text-outline hover:text-on-surface"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-ui-small text-error hover:opacity-80"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Omit<ColorAsset, "id">;
  onSave: (values: Omit<ColorAsset, "id">) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label || "");
  const [value, setValue] = useState(initial?.value || "#000000");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ label, value });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 space-y-2">
      <div>
        <label className="block text-ui-small text-outline mb-1">Color</label>
        <div className="flex gap-2 items-center">
          <input type="color" value={value} onChange={e => setValue(e.target.value)} className="w-8 h-8 rounded border-none cursor-pointer" />
          <input value={value} onChange={e => setValue(e.target.value)} className="flex-1 px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-ui-small text-outline mb-1">Label</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Optional name" className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-ui-small text-outline hover:text-on-surface">Cancel</button>
        <button type="submit" className="px-3 py-1.5 bg-primary text-on-primary rounded text-ui-small font-medium hover:opacity-90">Save</button>
      </div>
    </form>
  );
}
