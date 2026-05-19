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
        <div className="gap-sm flex items-center">
          <span className="material-symbols-outlined text-sm text-violet-400">
            ads_click
          </span>
          <span className="flex-1 truncate font-mono text-[11px] text-violet-300">
            {selector}
          </span>
        </div>
      </div>

      {/* AI Modifier */}
      <div className="p-md border-b border-slate-800">
        <h3 className="font-label-caps text-label-caps mb-sm text-slate-500">
          AI MODIFIER
        </h3>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          className="p-sm text-ui-small font-body-main text-on-surface focus:border-primary-container mb-sm h-32 w-full resize-none rounded border border-[#334155] bg-[#020617] placeholder-slate-600 focus:outline-none disabled:opacity-50"
          placeholder="Describe changes to the selected element..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && prompt.trim() && !loading) {
              e.preventDefault();
              handleApply();
            }
          }}
        />
        {error && (
          <p className="text-error mb-sm text-[10px]">{error}</p>
        )}
        <button
          onClick={handleApply}
          disabled={!prompt.trim() || loading}
          className="font-ui-small text-ui-small gap-xs flex w-full cursor-pointer items-center justify-center rounded bg-violet-600 py-1.5 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="mb-md flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-slate-500">
            LAYOUT
          </span>
        </div>
        <div className="gap-sm grid grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Width</label>
            <input className="w-full rounded border border-[#334155] bg-[#020617] px-2 py-1 font-mono text-xs text-slate-300" type="text" value={element.computedStyle.width || "auto"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Height</label>
            <input className="w-full rounded border border-[#334155] bg-[#020617] px-2 py-1 font-mono text-xs text-slate-300" type="text" value={element.computedStyle.height || "auto"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Padding</label>
            <input className="w-full rounded border border-[#334155] bg-[#020617] px-2 py-1 font-mono text-xs text-slate-300" type="text" value={element.computedStyle.padding || "0"} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Margin</label>
            <input className="w-full rounded border border-[#334155] bg-[#020617] px-2 py-1 font-mono text-xs text-slate-300" type="text" value={element.computedStyle.margin || "0"} readOnly />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="p-md border-b border-slate-800">
        <div className="mb-md flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-slate-500">
            APPEARANCE
          </span>
        </div>
        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Background</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle["background-color"] || "transparent"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Color</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle.color || "inherit"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Font Size</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle["font-size"] || "inherit"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Border Radius</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle["border-radius"] || "0"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Display</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle.display || "block"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Position</span>
            <span className="font-mono text-[10px] text-slate-500">{element.computedStyle.position || "static"}</span>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
