import type { SelectedElement } from "../pages/Editor";
import type { Attachment, ColorAttachment, ComponentAttachment, ElementAttachment, GraphicAttachment, IconAttachment, TypographyAttachment } from "./PromptBox.types";
import { getAttachmentLabel } from "./PromptBox.hooks";
import { buildElementSelector } from "./PropertiesPanel.utils";

const FONT_FAMILY_MAP: Record<string, string> = {
  "Font Awesome": "'Font Awesome 6 Free', 'Font Awesome 5 Free', 'FontAwesome'",
  "Material Icons": "'Material Icons', 'Material Symbols Outlined'",
  "Bootstrap Icons": "'bootstrap-icons'",
  "Remix Icons": "'remixicon'",
};

function ChipShell({ children, onRemove, className, onClick, title }: { children: React.ReactNode; onRemove: () => void; className: string; onClick?: () => void; title?: string }) {
  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onRemove();
  };
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-xs ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
      <button className="ml-1 inline-flex items-center hover:text-red-400" onClick={handleRemove}>
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
      </button>
    </div>
  );
}

function ImageChip({ attachment, onRemove }: { attachment: Attachment & { type: "image" }; onRemove: () => void }) {
  return (
    <ChipShell className="border-slate-700/50 bg-slate-800/80 py-1 pr-2 pl-1 text-slate-300" onRemove={onRemove}>
      <img alt="Thumb" className="h-6 w-6 rounded object-cover" src={attachment.dataUrl} />
      <span className="max-w-24 truncate font-medium">{attachment.name}</span>
    </ChipShell>
  );
}

function ElementChip({ attachment, onRemove, onSelect }: { attachment: ElementAttachment; onRemove: () => void; onSelect?: (attachment: ElementAttachment) => void }) {
  const clickable = !!onSelect;
  return (
    <ChipShell
      className={`border-violet-500/30 bg-violet-900/40 text-violet-200 ${clickable ? "transition-colors hover:bg-violet-900/60" : ""}`}
      onClick={clickable ? () => onSelect!(attachment) : undefined}
      onRemove={onRemove}
      title={clickable ? "Select element in editor" : undefined}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>extension</span>
      <span className="max-w-32 truncate font-mono text-[10px]">{getAttachmentLabel(attachment)}</span>
    </ChipShell>
  );
}

function ComponentChip({ attachment, onRemove }: { attachment: ComponentAttachment; onRemove: () => void }) {
  return (
    <ChipShell className="border-amber-500/30 bg-amber-900/30 text-amber-200" onRemove={onRemove} title={attachment.description}>
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>widgets</span>
      <span className="max-w-32 truncate font-medium">{attachment.label}</span>
    </ChipShell>
  );
}

function TypographyChip({ attachment, onRemove }: { attachment: TypographyAttachment; onRemove: () => void }) {
  return (
    <ChipShell className="border-sky-500/30 bg-sky-900/30 text-sky-200" onRemove={onRemove}>
      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>text_fields</span>
      <span className="max-w-32 truncate font-medium" style={{ fontFamily: attachment.fontFamily }}>{getAttachmentLabel(attachment)}</span>
    </ChipShell>
  );
}

function IconChip({ attachment, onRemove }: { attachment: IconAttachment; onRemove: () => void }) {
  const cssFontFamily = FONT_FAMILY_MAP[attachment.fontFamily] || `"${attachment.fontFamily}"`;
  const glyphContent = attachment.renderMode === "ligature"
    ? attachment.name
    : String.fromCodePoint(parseInt(attachment.codepoint, 16));
  return (
    <ChipShell className="border-emerald-500/30 bg-emerald-900/30 text-emerald-200" onRemove={onRemove} title={`${attachment.name} · ${attachment.fontFamily}`}>
      <span className="text-base leading-none" style={{ fontFamily: cssFontFamily, fontWeight: 900 }}>{glyphContent}</span>
      <span className="max-w-32 truncate font-mono text-[10px]">{attachment.name}</span>
    </ChipShell>
  );
}

function GraphicChip({ attachment, onRemove }: { attachment: GraphicAttachment; onRemove: () => void }) {
  const src = `mp-asset://assets/${attachment.projectId}/assets/${attachment.filename}`;
  return (
    <ChipShell className="border-slate-700/50 bg-slate-800/80 py-1 pr-2 pl-1 text-slate-300" onRemove={onRemove} title={attachment.filename}>
      <img alt={attachment.filename} className="h-6 w-6 rounded object-contain" src={src} />
      <span className="max-w-24 truncate font-medium">{attachment.filename}</span>
    </ChipShell>
  );
}

function ColorChip({ attachment, onRemove }: { attachment: ColorAttachment; onRemove: () => void }) {
  return (
    <ChipShell className="border-pink-500/30 bg-pink-900/20 py-1 pr-2 pl-1 text-pink-200" onRemove={onRemove} title={attachment.value}>
      <span className="border-outline/30 inline-block h-5 w-5 rounded border" style={{ backgroundColor: attachment.value }} />
      <span className="max-w-24 truncate font-mono text-[10px]">{attachment.value}</span>
    </ChipShell>
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

function renderChip(attachment: Attachment, onRemove: () => void, onSelectElement?: (attachment: ElementAttachment) => void) {
  switch (attachment.type) {
    case "image": return <ImageChip attachment={attachment} onRemove={onRemove} />;
    case "element": return <ElementChip attachment={attachment} onRemove={onRemove} onSelect={onSelectElement} />;
    case "component": return <ComponentChip attachment={attachment} onRemove={onRemove} />;
    case "typography": return <TypographyChip attachment={attachment} onRemove={onRemove} />;
    case "icon": return <IconChip attachment={attachment} onRemove={onRemove} />;
    case "graphic": return <GraphicChip attachment={attachment} onRemove={onRemove} />;
    case "color": return <ColorChip attachment={attachment} onRemove={onRemove} />;
  }
}

export function AttachmentChips({ attachments, onRemove, onSelectElement, suggestedElement, onPinSuggestion }: { attachments: Attachment[]; onRemove: (index: number) => void; onSelectElement?: (attachment: ElementAttachment) => void; suggestedElement?: SelectedElement | null; onPinSuggestion?: () => void }) {
  if (attachments.length === 0 && !suggestedElement) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2 px-1">
      {suggestedElement && onPinSuggestion && (
        <SuggestedElementChip element={suggestedElement} onPin={onPinSuggestion} />
      )}
      {attachments.map((attachment, index) => (
        <span key={index}>{renderChip(attachment, () => onRemove(index), onSelectElement)}</span>
      ))}
    </div>
  );
}
