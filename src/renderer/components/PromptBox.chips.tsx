import type { SelectedElement } from "../pages/Editor";
import type { Attachment, ElementAttachment } from "./PromptBox.types";
import { getAttachmentLabel } from "./PromptBox.hooks";
import { buildElementSelector } from "./PropertiesPanel.utils";

function ImageChip({ attachment, index, onRemove }: { attachment: Attachment & { type: "image" }; index: number; onRemove: (index: number) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/80 py-1 pr-2 pl-1 text-xs text-slate-300">
      <img alt="Thumb" className="h-6 w-6 rounded object-cover" src={attachment.dataUrl} />
      <span className="max-w-24 truncate font-medium">{attachment.name}</span>
      <button className="ml-1 inline-flex items-center hover:text-red-400" onClick={() => onRemove(index)}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span></button>
    </div>
  );
}

function ElementChip({ attachment, index, onRemove, onSelect }: { attachment: ElementAttachment; index: number; onRemove: (index: number) => void; onSelect?: (attachment: ElementAttachment) => void }) {
  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove(index);
  };
  const clickable = !!onSelect;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-900/40 px-2 py-1 text-xs text-violet-200 ${clickable ? "cursor-pointer transition-colors hover:bg-violet-900/60" : ""}`}
      onClick={clickable ? () => onSelect!(attachment) : undefined}
      title={clickable ? "Select element in editor" : undefined}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>extension</span>
      <span className="max-w-32 truncate font-mono text-[10px]">{getAttachmentLabel(attachment)}</span>
      <button className="ml-1 inline-flex items-center hover:text-violet-100" onClick={handleRemove}><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span></button>
    </div>
  );
}

function SuggestedElementChip({ element, onPin }: { element: SelectedElement; onPin: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-violet-500/30 bg-violet-900/20 px-2 py-1 text-xs text-violet-300/70">
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>extension</span>
      <span className="max-w-32 truncate font-mono text-[10px]">{buildElementSelector(element)}</span>
      <button className="ml-1 inline-flex items-center transition-colors hover:text-violet-100" onClick={onPin} title="Add to prompt"><span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span></button>
    </div>
  );
}

export function AttachmentChips({ attachments, onRemove, onSelectElement, suggestedElement, onPinSuggestion }: { attachments: Attachment[]; onRemove: (index: number) => void; onSelectElement?: (attachment: ElementAttachment) => void; suggestedElement?: SelectedElement | null; onPinSuggestion?: () => void }) {
  if (attachments.length === 0 && !suggestedElement) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2 px-1">
      {suggestedElement && onPinSuggestion && (
        <SuggestedElementChip element={suggestedElement} onPin={onPinSuggestion} />
      )}
      {attachments.map((attachment, index) =>
        attachment.type === "image"
          ? <ImageChip key={index} attachment={attachment} index={index} onRemove={onRemove} />
          : <ElementChip key={index} attachment={attachment} index={index} onRemove={onRemove} onSelect={onSelectElement} />,
      )}
    </div>
  );
}
