import type { Attachment, ImageAttachment } from "./PromptBox.types";
import type { AgentMessage } from "../hooks/useConversation";
import { buildElementSelector } from "./PropertiesPanel.utils";

interface AgentModifyArgs {
  prompt: string;
  attachments: Attachment[];
  getFullPageHTML?: () => string | null;
  onApply?: (newHTML: string, label?: string) => void;
  projectAssets?: object;
  previousAgentMessages?: AgentMessage[];
  continueFromMaxIterations?: boolean;
}

export interface AgentModifyResult {
  error?: string;
  summary?: string;
  maxIterationsReached?: boolean;
  messages?: AgentMessage[];
}

export async function applyAgentModification(args: AgentModifyArgs): Promise<AgentModifyResult> {
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

  // Live-apply HTML snapshots as the agent makes mutations, so the editor reflects changes
  // in real-time instead of jumping to the final state when the agent finishes.
  const unsubscribe = window.api.onAiAgentProgress((progress) => {
    if (progress.type === "html_update" && progress.html) {
      args.onApply?.(progress.html, args.prompt);
    }
  });

  try {
    const result = await window.api.aiAgentModify({
      prompt: args.prompt,
      fullHTML: fullHtml,
      attachedElements: attachedElements.length > 0 ? attachedElements : undefined,
      images: images.length > 0 ? images : undefined,
      projectAssets: args.projectAssets,
      previousAgentMessages: args.previousAgentMessages,
      continueFromMaxIterations: args.continueFromMaxIterations,
    });

    if (!result.success || !result.html) return { error: result.error || "Agent modification failed", messages: result.messages as AgentMessage[] | undefined };
    args.onApply?.(result.html, args.prompt);
    return { summary: result.summary, maxIterationsReached: result.maxIterationsReached, messages: result.messages as AgentMessage[] | undefined };
  } finally {
    unsubscribe();
  }
}

