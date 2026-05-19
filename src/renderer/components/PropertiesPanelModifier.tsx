import type { KeyboardEventHandler, RefObject } from "react";

interface PropertiesPanelModifierProps {
  error: string;
  handleApply: () => void | Promise<void>;
  handlePromptKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  loading: boolean;
  prompt: string;
  setPrompt: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export function PropertiesPanelModifier({
  error,
  handleApply,
  handlePromptKeyDown,
  loading,
  prompt,
  setPrompt,
  textareaRef,
}: PropertiesPanelModifierProps) {
  return (
    <div className="p-md border-b border-slate-800">
      <h3 className="font-label-caps text-label-caps mb-sm text-slate-500">AI MODIFIER</h3>
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={handlePromptKeyDown}
        disabled={loading}
        className="p-sm text-ui-small font-body-main text-on-surface focus:border-primary-container mb-sm h-32 w-full resize-none rounded border border-[#334155] bg-[#020617] placeholder-slate-600 focus:outline-none disabled:opacity-50"
        placeholder="Describe changes to the selected element..."
      />
      {error ? <p className="text-error mb-sm text-[10px]">{error}</p> : null}
      <button
        onClick={handleApply}
        disabled={!prompt.trim() || loading}
        className="font-ui-small text-ui-small gap-xs flex w-full cursor-pointer items-center justify-center rounded bg-violet-600 py-1.5 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>Generating...</>
        ) : (
          <><span className="material-symbols-outlined text-sm">bolt</span>Apply Modification</>
        )}
      </button>
    </div>
  );
}
