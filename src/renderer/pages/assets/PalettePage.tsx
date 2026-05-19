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
    <div className="mx-auto max-w-5xl">
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
          className="bg-primary text-on-primary text-ui-small rounded-md px-4 py-2 font-medium hover:opacity-90"
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {colors.map(c => (
          <div key={c.id} className="border-outline/20 bg-surface overflow-hidden rounded-lg border">
            {editingId === c.id ? (
              <ColorForm
                initial={c}
                onSave={(values) => handleSave({ ...values, id: c.id })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div>
                <div
                  className="border-outline/20 h-16 w-full border-b"
                  style={{ backgroundColor: c.value }}
                />
                <div className="p-2">
                  <p className="text-ui-small text-on-surface truncate font-mono">{c.value}</p>
                  {c.label && <p className="text-ui-small text-outline truncate">{c.label}</p>}
                  <div className="mt-1 flex gap-2">
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
    <form onSubmit={handleSubmit} className="space-y-2 p-3">
      <div>
        <label className="text-ui-small text-outline mb-1 block">Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={value} onChange={e => setValue(e.target.value)} className="h-8 w-8 cursor-pointer rounded border-none" />
          <input value={value} onChange={e => setValue(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small flex-1 rounded border px-2 py-1 font-mono" />
        </div>
      </div>
      <div>
        <label className="text-ui-small text-outline mb-1 block">Label</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Optional name" className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-ui-small text-outline hover:text-on-surface px-3 py-1.5">Cancel</button>
        <button type="submit" className="bg-primary text-on-primary text-ui-small rounded px-3 py-1.5 font-medium hover:opacity-90">Save</button>
      </div>
    </form>
  );
}
