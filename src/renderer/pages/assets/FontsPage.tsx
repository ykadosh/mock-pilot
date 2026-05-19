import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";

interface TypographyAsset {
  id: string;
  label: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
}

export function FontsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [typography, setTypography] = useState<TypographyAsset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!projectId) return;
    const result = await window.api.loadProjectAssets(projectId);
    if (result.success && result.assets) {
      setTypography(result.assets.typography || []);
    }
  }, [projectId]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const saveTypography = async (updated: TypographyAsset[]) => {
    if (!projectId) return;
    setTypography(updated);
    const result = await window.api.loadProjectAssets(projectId);
    const assets = result.success && result.assets ? result.assets : { typography: [], colors: [] };
    assets.typography = updated;
    await window.api.saveProjectAssets(projectId, assets);
  };

  const handleDelete = (id: string) => {
    saveTypography(typography.filter(t => t.id !== id));
  };

  const handleSave = (item: TypographyAsset) => {
    const updated = typography.map(t => t.id === item.id ? item : t);
    saveTypography(updated);
    setEditingId(null);
  };

  const handleAdd = (item: Omit<TypographyAsset, "id">) => {
    const newItem: TypographyAsset = { ...item, id: "typo-" + Date.now() };
    saveTypography([...typography, newItem]);
    setShowAddForm(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-lg flex items-center justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">
            Typography
          </h1>
          <p className="text-ui-small text-outline">
            Manage your workspace typography assets.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary text-on-primary text-ui-small rounded-md px-4 py-2 font-medium hover:opacity-90"
        >
          + Add Typography
        </button>
      </header>

      {showAddForm && (
        <TypographyForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {typography.length === 0 && !showAddForm && (
        <p className="text-outline text-ui-small">No typography assets yet. Capture a website or add one manually.</p>
      )}

      <div className="space-y-3">
        {typography.map(t => (
          <div key={t.id} className="border-outline/20 bg-surface rounded-lg border p-4">
            {editingId === t.id ? (
              <TypographyForm
                initial={t}
                onSave={(values) => handleSave({ ...values, id: t.id })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-on-surface mb-1 truncate"
                    style={{
                      fontFamily: t.fontFamily,
                      fontSize: t.fontSize,
                      fontWeight: t.fontWeight,
                      fontStyle: t.fontStyle,
                      lineHeight: t.lineHeight,
                      letterSpacing: t.letterSpacing,
                      textTransform: t.textTransform as React.CSSProperties["textTransform"],
                    }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <p className="text-ui-small text-outline mt-1">
                    {t.label || t.fontFamily.split(",")[0].replace(/['"]/g, "")} · {t.fontSize} · {t.fontWeight}
                    {t.fontStyle !== "normal" && ` · ${t.fontStyle}`}
                  </p>
                </div>
                <div className="ml-4 flex gap-2">
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="text-ui-small text-outline hover:text-on-surface"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-ui-small text-error hover:opacity-80"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TypographyForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Omit<TypographyAsset, "id">;
  onSave: (values: Omit<TypographyAsset, "id">) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label || "");
  const [fontFamily, setFontFamily] = useState(initial?.fontFamily || "sans-serif");
  const [fontSize, setFontSize] = useState(initial?.fontSize || "16px");
  const [fontWeight, setFontWeight] = useState(initial?.fontWeight || "400");
  const [fontStyle, setFontStyle] = useState(initial?.fontStyle || "normal");
  const [lineHeight, setLineHeight] = useState(initial?.lineHeight || "normal");
  const [letterSpacing, setLetterSpacing] = useState(initial?.letterSpacing || "normal");
  const [textTransform, setTextTransform] = useState(initial?.textTransform || "none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ label, fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform });
  };

  return (
    <form onSubmit={handleSubmit} className="border-outline/20 bg-surface mb-3 space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-ui-small text-outline mb-1 block">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Font Family</label>
          <input value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Font Size</label>
          <input value={fontSize} onChange={e => setFontSize(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Font Weight</label>
          <input value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Font Style</label>
          <select value={fontStyle} onChange={e => setFontStyle(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1">
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Line Height</label>
          <input value={lineHeight} onChange={e => setLineHeight(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Letter Spacing</label>
          <input value={letterSpacing} onChange={e => setLetterSpacing(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label className="text-ui-small text-outline mb-1 block">Text Transform</label>
          <select value={textTransform} onChange={e => setTextTransform(e.target.value)} className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1">
            <option value="none">None</option>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-ui-small text-outline hover:text-on-surface px-3 py-1.5">Cancel</button>
        <button type="submit" className="bg-primary text-on-primary text-ui-small rounded px-3 py-1.5 font-medium hover:opacity-90">Save</button>
      </div>
    </form>
  );
}
