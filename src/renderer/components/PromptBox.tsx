import { useEffect } from "react";
import type { SelectedElement } from "../pages/Editor";
import type { Attachment, ElementAttachment } from "./PromptBox.types";
import { AttachmentChips } from "./PromptBox.chips";
import { AgentProgressIndicator } from "./AgentProgressIndicator";
import { DragOverlay, ReadOnlyPromptBox, getContainerClass } from "./PromptBox.parts";

interface PromptBoxProps {
  addElementAttachment: (element: SelectedElement) => void;
  agentProgress?: { toolName?: string; iteration?: number; maxIterations?: number } | null;
  attachments: Attachment[];
  designActive?: boolean;
  error: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleApply: () => void | Promise<void>;
  handleCancel: () => void | Promise<void>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: () => void;
  handlePaste: (event: React.ClipboardEvent) => void;
  handleDragEnter: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  handleDragLeave: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  isDraggingOver: boolean;
  handlePromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement>;
  loading: boolean;
  prompt: string;
  removeAttachment: (index: number) => void;
  selectedElement: SelectedElement | null;
  setPrompt: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onStartNewConversation?: () => void;
  onSelectElementAttachment?: (attachment: ElementAttachment) => void;
}

function SubmitButton({ handleApply, handleCancel, loading, prompt }: Pick<PromptBoxProps, "handleApply" | "handleCancel" | "loading" | "prompt">) {
  if (loading) {
    return (
      <button
        onClick={() => void handleCancel()}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95"
        title="Cancel request"
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>stop</span>
      </button>
    );
  }
  return (
    <button
      onClick={() => void handleApply()}
      disabled={!prompt.trim()}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-2xl">bolt</span>
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
          <span className="material-symbols-outlined text-2xl">attach_file</span>
        </button>
        <SubmitButton handleApply={handleApply} handleCancel={handleCancel} loading={loading} prompt={prompt} />
      </div>
    </div>
  );
}


function DesignActiveChip() {
  return (
    <div
      className="mb-2 inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300"
      title="A design.md spec is active for this project — every AI edit is grounded in it."
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>design_services</span>
      Design spec active
    </div>
  );
}

function PromptBoxInner(props: PromptBoxProps) {
  const isPinned = props.selectedElement && props.attachments.some((a) => a.type === "element" && a.element.mpId === props.selectedElement!.mpId);
  const suggestedElement = props.selectedElement && !isPinned ? props.selectedElement : null;
  const handlePinSuggestion = () => {
    if (suggestedElement) props.addElementAttachment(suggestedElement);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-70 flex justify-center px-4">
      <div
        onDragEnter={props.handleDragEnter}
        onDragOver={props.handleDragOver}
        onDragLeave={props.handleDragLeave}
        onDrop={props.handleDrop}
        className={getContainerClass(props.loading, props.isDraggingOver)}
      >
        {props.isDraggingOver && !props.loading && <DragOverlay />}
        <div className={`rounded-xl p-3 ${props.loading ? "prompt-box-inner backdrop-blur-lg" : ""}`}>
          <AttachmentChips attachments={props.attachments} onRemove={props.removeAttachment} onSelectElement={props.onSelectElementAttachment} suggestedElement={suggestedElement} onPinSuggestion={handlePinSuggestion} />
          {props.designActive && <DesignActiveChip />}
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

export function PromptBox(props: PromptBoxProps) {
  if (props.readOnly) {
    return <ReadOnlyPromptBox onStartNewConversation={props.onStartNewConversation} />;
  }
  return <PromptBoxInner {...props} />;
}
