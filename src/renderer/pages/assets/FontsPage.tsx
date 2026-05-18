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
    <div className="max-w-5xl mx-auto">
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
          className="px-4 py-2 bg-primary text-on-primary rounded-md text-ui-small font-medium hover:opacity-90"
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
          <div key={t.id} className="border border-outline/20 rounded-lg p-4 bg-surface">
            {editingId === t.id ? (
              <TypographyForm
                initial={t}
                onSave={(values) => handleSave({ ...values, id: t.id })}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate mb-1 text-on-surface"
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
                <div className="flex gap-2 ml-4">
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
    <form onSubmit={handleSubmit} className="border border-outline/20 rounded-lg p-4 bg-surface mb-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-ui-small text-outline mb-1">Label</label>
          <input value={label} onChange={e => setLabel(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Font Family</label>
          <input value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Font Size</label>
          <input value={fontSize} onChange={e => setFontSize(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Font Weight</label>
          <input value={fontWeight} onChange={e => setFontWeight(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Font Style</label>
          <select value={fontStyle} onChange={e => setFontStyle(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small">
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Line Height</label>
          <input value={lineHeight} onChange={e => setLineHeight(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Letter Spacing</label>
          <input value={letterSpacing} onChange={e => setLetterSpacing(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small" />
        </div>
        <div>
          <label className="block text-ui-small text-outline mb-1">Text Transform</label>
          <select value={textTransform} onChange={e => setTextTransform(e.target.value)} className="w-full px-2 py-1 rounded border border-outline/30 bg-background text-on-surface text-ui-small">
            <option value="none">None</option>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-ui-small text-outline hover:text-on-surface">Cancel</button>
        <button type="submit" className="px-3 py-1.5 bg-primary text-on-primary rounded text-ui-small font-medium hover:opacity-90">Save</button>
      </div>
    </form>
  );
}
