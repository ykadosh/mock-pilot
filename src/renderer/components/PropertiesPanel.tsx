import { useState, useRef, useEffect } from "react";
import type { SelectedElement } from "../pages/Editor";
import { SidePanel } from "./ui/SidePanel";

interface PropertiesPanelProps {
  element: SelectedElement;
  onClose: () => void;
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  getElementHTML?: () => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
}

export function PropertiesPanel({ element, onClose, onApplyModification, getElementHTML }: PropertiesPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [element]);

  const selector = element.tagName +
    (element.id ? `#${element.id}` : "") +
    (element.className ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "");

  const handleApply = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    try {
      // Fetch the current HTML from the iframe (reflects prior modifications)
      const current = await getElementHTML?.();
      const outerHTML = current?.outerHTML ?? element.outerHTML;
      const computedStyle = current?.computedStyle ?? element.computedStyle;

      const result = await window.api.aiModifyElement({
        prompt: prompt.trim(),
        outerHTML,
        computedStyle,
      });
      if (result.success && result.html) {
        onApplyModification?.(element.mpId, result.html, prompt.trim());
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
    <SidePanel title="ELEMENT PROPERTIES" onClose={onClose}>
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

      {/* AI Modifier */}
      <div className="p-md border-b border-slate-800">
        <h3 className="font-label-caps text-label-caps text-slate-500 mb-sm">
          AI MODIFIER
        </h3>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          className="w-full bg-[#020617] border border-[#334155] rounded p-sm text-ui-small font-body-main text-on-surface focus:outline-none focus:border-primary-container h-32 resize-none placeholder-slate-600 mb-sm disabled:opacity-50"
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
            <label className="text-[10px] text-slate-500 uppercase font-bold">Width</label>
            <input className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300" type="text" value={element.computedStyle.width || "auto"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold">Height</label>
            <input className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300" type="text" value={element.computedStyle.height || "auto"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold">Padding</label>
            <input className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300" type="text" value={element.computedStyle.padding || "0"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold">Margin</label>
            <input className="w-full bg-[#020617] border border-[#334155] rounded px-2 py-1 text-xs font-mono text-slate-300" type="text" value={element.computedStyle.margin || "0"} readOnly />
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
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle["background-color"] || "transparent"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Color</span>
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle.color || "inherit"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Font Size</span>
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle["font-size"] || "inherit"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Border Radius</span>
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle["border-radius"] || "0"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Display</span>
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle.display || "block"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Position</span>
            <span className="text-[10px] font-mono text-slate-500">{element.computedStyle.position || "static"}</span>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
