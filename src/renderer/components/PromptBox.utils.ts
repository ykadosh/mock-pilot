import type { Attachment, ImageAttachment } from "./PromptBox.types";
import { buildElementSelector } from "./PropertiesPanel.utils";

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

interface AgentModifyArgs {
  prompt: string;
  attachments: Attachment[];
  getFullPageHTML?: () => string | null;
  onApply?: (newHTML: string, label?: string) => void;
  projectAssets?: object;
  continueFromPrevious?: boolean;
}

export async function applyAgentModification(args: AgentModifyArgs): Promise<{ error?: string; summary?: string; maxIterationsReached?: boolean }> {
  const fullHtml = args.getFullPageHTML?.();
  if (!fullHtml) return { error: "No page content available" };

  const images = args.attachments
    .filter((a): a is ImageAttachment => a.type === "image")
    .map((a) => ({ name: a.name, dataUrl: a.dataUrl }));

  const attachedElements = args.attachments
    .filter((a) => a.type === "element")
    .map((a) => {
      if (a.type !== "element") return null;
      return {
        mpId: a.element.mpId,
        selector: buildElementSelector(a.element),
        outerHTML: a.element.outerHTML,
      };
    })
    .filter(Boolean) as { mpId: string; selector: string; outerHTML: string }[];

  const result = await window.api.aiAgentModify({
    prompt: args.prompt,
    fullHTML: fullHtml,
    attachedElements: attachedElements.length > 0 ? attachedElements : undefined,
    images: images.length > 0 ? images : undefined,
    projectAssets: args.projectAssets,
    continueFromPrevious: args.continueFromPrevious,
  });

  if (!result.success || !result.html) return { error: result.error || "Agent modification failed" };
  args.onApply?.(result.html, args.prompt);
  return { summary: result.summary, maxIterationsReached: result.maxIterationsReached };
}

/**
 * Determine whether a prompt is simple enough for single-shot modification.
 * Simple = short prompt + single element + simple verb (no images attached).
 */
export function isSimplePrompt(prompt: string, attachments: Attachment[]): boolean {
  const hasImages = attachments.some((a) => a.type === "image");
  if (hasImages) return false;

  const elementCount = attachments.filter((a) => a.type === "element").length;
  if (elementCount > 1) return false;

  // Only consider single-element with simple, short prompt as simple
  if (elementCount === 0) return false;

  // Heuristic: short prompt with simple verbs
  const trimmed = prompt.trim();
  if (trimmed.length > 150) return false;

  const complexPatterns = /\b(add column|add row|reorganize|redesign|restructure|rearrange|create|build|implement|generate|duplicate|split|merge|convert to|transform)\b/i;
  if (complexPatterns.test(trimmed)) return false;

  return true;
}
