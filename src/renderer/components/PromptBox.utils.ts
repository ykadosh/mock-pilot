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
  projectId?: string;
  sessionId?: string;
}

export interface AgentModifyResult {
  error?: string;
  summary?: string;
  maxIterationsReached?: boolean;
  messages?: AgentMessage[];
}

function inferMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : "application/octet-stream";
}

function approxBytesFromDataUrl(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return 0;
  const b64 = dataUrl.slice(commaIdx + 1);
  let padding = 0;
  if (b64.endsWith("==")) padding = 2;
  else if (b64.endsWith("=")) padding = 1;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function buildAttachmentPayloads(attachments: Attachment[]) {
  const images = attachments
    .filter((a): a is ImageAttachment => a.type === "image")
    .map((a) => ({
      id: a.id,
      name: a.name,
      dataUrl: a.dataUrl,
      mimeType: inferMimeFromDataUrl(a.dataUrl),
      sizeBytes: approxBytesFromDataUrl(a.dataUrl),
    }));

  const attachedElements = attachments
    .filter((a) => a.type === "element")
    .map((a) => {
      if (a.type !== "element") return null;
      return { mpId: a.element.mpId, selector: buildElementSelector(a.element), outerHTML: a.element.outerHTML };
    })
    .filter(Boolean) as { mpId: string; selector: string; outerHTML: string }[];

  return { images, attachedElements };
}

export async function applyAgentModification(args: AgentModifyArgs): Promise<AgentModifyResult> {
  const fullHtml = args.getFullPageHTML?.();
  if (!fullHtml) return { error: "No page content available" };

  const { images, attachedElements } = buildAttachmentPayloads(args.attachments);

  // Live-apply HTML snapshots as the agent mutates, so the editor reflects changes in real-time.
  const unsubscribe = window.api.onAiAgentProgress((progress) => {
    if (progress.type === "html_update" && progress.html) args.onApply?.(progress.html, args.prompt);
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
      projectId: args.projectId,
      sessionId: args.sessionId,
    });

    if (!result.success || !result.html) return { error: result.error || "Agent modification failed", messages: result.messages as AgentMessage[] | undefined };
    args.onApply?.(result.html, args.prompt);
    return { summary: result.summary, maxIterationsReached: result.maxIterationsReached, messages: result.messages as AgentMessage[] | undefined };
  } finally {
    unsubscribe();
  }
}

