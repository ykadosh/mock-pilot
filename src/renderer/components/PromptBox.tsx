import { useEffect } from "react";
import type { Attachment } from "./PromptBox.types";
import { getAttachmentLabel } from "./PromptBox.hooks";
import { AgentProgressIndicator } from "./AgentProgressIndicator";

interface PromptBoxProps {
  agentProgress?: { toolName?: string; iteration?: number; maxIterations?: number } | null;
  attachments: Attachment[];
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleApply: () => void | Promise<void>;
  handleCancel: () => void | Promise<void>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: () => void;
  handlePaste: (event: React.ClipboardEvent) => void;
  handlePromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  loading: boolean;
  prompt: string;
  removeAttachment: (index: number) => void;
  setPrompt: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

function ImageChip({ attachment, index, onRemove }: { attachment: Attachment & { type: "image" }; index: number; onRemove: (index: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/80 py-1 pr-2 pl-1 text-xs text-slate-300">
      <img alt="Thumb" className="h-6 w-6 rounded object-cover" src={attachment.dataUrl} />
      <span className="max-w-24 truncate font-medium">{attachment.name}</span>
      <button className="material-symbols-outlined ml-1 text-[14px] hover:text-red-400" onClick={() => onRemove(index)}>close</button>
    </div>
  );
}

function ElementChip({ attachment, index, onRemove }: { attachment: Attachment; index: number; onRemove: (index: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-900/40 px-2 py-1 text-xs text-violet-200">
      <span className="material-symbols-outlined text-[14px]">extension</span>
      <span className="max-w-32 truncate font-mono text-[10px]">{getAttachmentLabel(attachment)}</span>
      <button className="material-symbols-outlined ml-1 text-[14px] hover:text-violet-100" onClick={() => onRemove(index)}>close</button>
    </div>
  );
}

function AttachmentChips({ attachments, onRemove }: { attachments: Attachment[]; onRemove: (index: number) => void }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2 px-1">
      {attachments.map((attachment, index) =>
        attachment.type === "image"
          ? <ImageChip key={index} attachment={attachment} index={index} onRemove={onRemove} />
          : <ElementChip key={index} attachment={attachment} index={index} onRemove={onRemove} />,
      )}
    </div>
  );
}

function SubmitButton({ handleApply, handleCancel, loading, prompt }: Pick<PromptBoxProps, "handleApply" | "handleCancel" | "loading" | "prompt">) {
  if (loading) {
    return (
      <button
        onClick={() => void handleCancel()}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95"
        title="Cancel request"
      >
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>stop</span>
      </button>
    );
  }
  return (
    <button
      onClick={() => void handleApply()}
      disabled={!prompt.trim()}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-lg">bolt</span>
    </button>
  );
}

function PromptInput({ handleApply, handleCancel, handleFileSelect, handlePaste, handlePromptKeyDown, loading, prompt, setPrompt, textareaRef }: Pick<PromptBoxProps, "handleApply" | "handleCancel" | "handleFileSelect" | "handlePaste" | "handlePromptKeyDown" | "loading" | "prompt" | "setPrompt" | "textareaRef">) {
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [prompt, textareaRef]);

  return (
    <div className="relative flex items-end overflow-hidden rounded-xl bg-transparent transition-all">
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={handlePromptKeyDown}
        onPaste={handlePaste}
        disabled={loading}
        rows={1}
        className="font-body-main text-body-main max-h-48 min-h-12 flex-1 resize-none border-none bg-transparent p-3 text-slate-200 placeholder-slate-500 outline-none focus:ring-0 focus:outline-none disabled:opacity-50"
        placeholder="Describe your changes..."
      />
      <div className="flex items-center gap-2 pr-3 pb-2">
        <button className="flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:text-slate-300" onClick={handleFileSelect} title="Attach image">
          <span className="material-symbols-outlined">attach_file</span>
        </button>
        <SubmitButton handleApply={handleApply} handleCancel={handleCancel} loading={loading} prompt={prompt} />
      </div>
    </div>
  );
}

export function PromptBox(props: PromptBoxProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-70 flex justify-center px-4">
      <div className={`pointer-events-auto w-full max-w-2xl rounded-2xl shadow-2xl transition-colors ${props.loading ? "prompt-box-loading" : "border border-slate-600/20 bg-[rgba(15,23,42,0.85)] backdrop-blur-xl focus-within:border-slate-500/40"}`}>
        <div className={`rounded-2xl p-3 ${props.loading ? "prompt-box-inner backdrop-blur-xl" : ""}`}>
          <AttachmentChips attachments={props.attachments} onRemove={props.removeAttachment} />
          {props.error && <p className="text-error mb-2 px-3 text-[10px]">{props.error}</p>}
          <AgentProgressIndicator progress={props.agentProgress} />
          <PromptInput
            handleApply={props.handleApply}
            handleCancel={props.handleCancel}
            handleFileSelect={props.handleFileSelect}
            handlePaste={props.handlePaste}
            handlePromptKeyDown={props.handlePromptKeyDown}
            loading={props.loading}
            prompt={props.prompt}
            setPrompt={props.setPrompt}
            textareaRef={props.textareaRef}
          />
          <input ref={props.fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={props.handleFileChange} />
        </div>
      </div>
    </div>
  );
}
