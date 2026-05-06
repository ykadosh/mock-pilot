import { useState } from "react";
import type { SelectedElement } from "../pages/Editor";

interface PropertiesPanelProps {
  element: SelectedElement;
  onClose: () => void;
  onApplyModification?: (mpId: string, newHTML: string) => void;
}

export function PropertiesPanel({ element, onClose, onApplyModification }: PropertiesPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selector = element.tagName +
    (element.id ? `#${element.id}` : "") +
    (element.className ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "");

  const handleApply = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await window.api.aiModifyElement({
        prompt: prompt.trim(),
        outerHTML: element.outerHTML,
        computedStyle: element.computedStyle,
      });
      if (result.success && result.html) {
        onApplyModification?.(element.mpId, result.html);
        setPrompt("");
      } else {
        setError(result.error || "Failed to modify element");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="absolute right-4 top-14 bottom-4 w-72 bg-slate-900/90 backdrop-blur-md border border-[#334155] rounded-lg flex flex-col overflow-hidden shadow-2xl">
      <div className="p-sm border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <span className="font-label-caps text-label-caps text-slate-300">
          ELEMENT PROPERTIES
        </span>
        <button
          onClick={onClose}
          className="material-symbols-outlined text-sm text-slate-500 hover:text-slate-200 cursor-pointer"
        >
          close
        </button>
      </div>

      {/* Selected element indicator */}
      <div className="p-sm border-b border-slate-800 bg-violet-900/20">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-sm text-violet-400">
            ads_click
          </span>
          <span className="text-[11px] font-mono text-violet-300 truncate">
            {selector}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* AI Modifier */}
        <div className="p-md border-b border-slate-800">
          <h3 className="font-label-caps text-label-caps text-slate-500 mb-sm">
            AI MODIFIER
          </h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="w-full bg-[#020617] border border-[#334155] rounded p-sm text-ui-small font-body-main text-on-surface focus:outline-none focus:border-primary-container h-24 resize-none placeholder-slate-600 mb-sm disabled:opacity-50"
            placeholder="Describe changes to the selected element..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && prompt.trim() && !loading) {
                e.preventDefault();
                handleApply();
              }
            }}
          />
          {error && (
            <p className="text-[10px] text-error mb-sm">{error}</p>
          )}
          <button
            onClick={handleApply}
            disabled={!prompt.trim() || loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-ui-small text-ui-small py-1.5 rounded transition-colors flex items-center justify-center gap-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Generating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">bolt</span>
                Apply Modification
              </>
            )}
          </button>
        </div>

        {/* Layout */}
        <div className="p-md border-b border-slate-800">
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-caps text-label-caps text-slate-500">
              LAYOUT
            </span>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Width
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                value={element.computedStyle.width || "auto"}
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Height
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                value={element.computedStyle.height || "auto"}
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Padding
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                value={element.computedStyle.padding || "0"}
                readOnly
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-bold">
                Margin
              </label>
              <input
                className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300"
                type="text"
                value={element.computedStyle.margin || "0"}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-md border-b border-slate-800">
          <div className="flex justify-between items-center mb-md">
            <span className="font-label-caps text-label-caps text-slate-500">
              APPEARANCE
            </span>
          </div>
          <div className="space-y-md">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Background</span>
              <div className="flex items-center gap-sm">
                <span className="text-[10px] font-mono text-slate-500">
                  {element.computedStyle["background-color"] || "transparent"}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Color</span>
              <div className="flex items-center gap-sm">
                <span className="text-[10px] font-mono text-slate-500">
                  {element.computedStyle.color || "inherit"}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Font Size</span>
              <span className="text-[10px] font-mono text-slate-500">
                {element.computedStyle["font-size"] || "inherit"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Border Radius</span>
              <span className="text-[10px] font-mono text-slate-500">
                {element.computedStyle["border-radius"] || "0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Display</span>
              <span className="text-[10px] font-mono text-slate-500">
                {element.computedStyle.display || "block"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Position</span>
              <span className="text-[10px] font-mono text-slate-500">
                {element.computedStyle.position || "static"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
