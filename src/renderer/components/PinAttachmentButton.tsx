import type { Attachment } from "./PromptBox.types";
import { usePromptAttachments } from "../hooks/usePromptAttachments";

interface Props {
  projectId: string | undefined;
  attachment: Attachment;
  variant?: "default" | "icon" | "overlay";
  className?: string;
}

const ICON_NAME = "keep";
const FILL_VARIATION = "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24";

function OverlayButton({ onClick, attached, title, className }: { onClick: (e: React.MouseEvent) => void; attached: boolean; title: string; className: string }) {
  return (
    <button onClick={onClick} title={title} className={`bg-surface/90 border-outline/30 absolute top-1 right-1 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border shadow-sm transition-colors ${attached ? "text-primary" : "text-outline hover:text-on-surface"} ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: attached ? FILL_VARIATION : undefined }}>{ICON_NAME}</span>
    </button>
  );
}

function IconButton({ onClick, attached, title, className }: { onClick: (e: React.MouseEvent) => void; attached: boolean; title: string; className: string }) {
  return (
    <button onClick={onClick} title={title} className={`inline-flex items-center justify-center transition-colors ${attached ? "text-primary" : "text-outline hover:text-on-surface"} ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: attached ? FILL_VARIATION : undefined }}>{ICON_NAME}</span>
    </button>
  );
}

function DefaultButton({ onClick, attached, title, className }: { onClick: (e: React.MouseEvent) => void; attached: boolean; title: string; className: string }) {
  return (
    <button onClick={onClick} title={title} className={`inline-flex items-center gap-1 text-xs transition-colors ${attached ? "text-primary" : "text-outline hover:text-on-surface"} ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: attached ? FILL_VARIATION : undefined }}>{ICON_NAME}</span>
      <span>{attached ? "Pinned" : "Pin"}</span>
    </button>
  );
}

export function PinAttachmentButton({ projectId, attachment, variant = "default", className = "" }: Props) {
  const { isAttached, toggleAttachment } = usePromptAttachments(projectId);
  const attached = isAttached(attachment);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleAttachment(attachment);
  };
  const title = attached ? "Unpin from prompt" : "Pin to prompt";
  const props = { onClick: handleClick, attached, title, className };
  if (variant === "overlay") return <OverlayButton {...props} />;
  if (variant === "icon") return <IconButton {...props} />;
  return <DefaultButton {...props} />;
}
