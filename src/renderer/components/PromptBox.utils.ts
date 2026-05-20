import type { Attachment, ImageAttachment } from "./PromptBox.types";

interface ModifyElementArgs {
  attachments: Attachment[];
  prompt: string;
  getElementHTML?: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
  onApply?: (mpId: string, newHTML: string, label?: string) => void;
}

export async function applyElementModification(args: ModifyElementArgs): Promise<string | null> {
  const elements = args.attachments.filter((a) => a.type === "element");
  for (const attachment of elements) {
    if (attachment.type !== "element") continue;
    const error = await modifySingleElement(attachment.element, args);
    if (error) return error;
  }
  return null;
}

async function modifySingleElement(element: { mpId: string; outerHTML: string; computedStyle: Record<string, string> }, args: ModifyElementArgs) {
  const current = await args.getElementHTML?.(element.mpId);
  const result = await window.api.aiModifyElement({
    prompt: args.prompt,
    outerHTML: current?.outerHTML ?? element.outerHTML,
    computedStyle: current?.computedStyle ?? element.computedStyle,
  });
  if (!result.success || !result.html) return result.error || "Failed to modify element";
  args.onApply?.(element.mpId, result.html, args.prompt);
  return null;
}

interface ModifyPageArgs {
  prompt: string;
  attachments: Attachment[];
  getFullPageHTML?: () => string | null;
  onApply?: (newHTML: string, label?: string) => void;
}

export async function applyPageModification(args: ModifyPageArgs): Promise<string | null> {
  const fullHtml = args.getFullPageHTML?.();
  if (!fullHtml) return "No page content available";
  const images = args.attachments
    .filter((a): a is ImageAttachment => a.type === "image")
    .map((a) => ({ name: a.name, dataUrl: a.dataUrl }));
  const result = await window.api.aiModifyPage({ prompt: args.prompt, fullHTML: fullHtml, images });
  if (!result.success || !result.html) return result.error || "Failed to modify page";
  args.onApply?.(result.html, args.prompt);
  return null;
}
