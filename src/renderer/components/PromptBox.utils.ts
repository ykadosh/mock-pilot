import type { Attachment, ImageAttachment } from "./PromptBox.types";
import { buildElementSelector } from "./PropertiesPanel.utils";

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
