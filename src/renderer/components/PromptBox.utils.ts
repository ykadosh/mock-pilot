import type { Attachment, ColorAttachment, ComponentAttachment, IconAttachment, ImageAttachment, TypographyAttachment } from "./PromptBox.types";
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

export interface AttachedAssetsPayload {
  components: Pick<ComponentAttachment, "id" | "label" | "html" | "description" | "props">[];
  typography: Pick<TypographyAttachment, "id" | "label" | "fontFamily" | "fontSize" | "fontWeight" | "fontStyle" | "lineHeight" | "letterSpacing" | "textTransform">[];
  icons: Pick<IconAttachment, "name" | "codepoint" | "fontFamily" | "renderMode">[];
  graphics: { filename: string; extension: string; sizeBytes: number; assetPath: string }[];
  colors: Pick<ColorAttachment, "id" | "label" | "value">[];
}

function buildAssetPayloads(attachments: Attachment[]): AttachedAssetsPayload | undefined {
  const components: AttachedAssetsPayload["components"] = [];
  const typography: AttachedAssetsPayload["typography"] = [];
  const icons: AttachedAssetsPayload["icons"] = [];
  const graphics: AttachedAssetsPayload["graphics"] = [];
  const colors: AttachedAssetsPayload["colors"] = [];

  for (const a of attachments) {
    switch (a.type) {
      case "component":
        components.push({ id: a.id, label: a.label, html: a.html, description: a.description, props: a.props });
        break;
      case "typography":
        typography.push({ id: a.id, label: a.label, fontFamily: a.fontFamily, fontSize: a.fontSize, fontWeight: a.fontWeight, fontStyle: a.fontStyle, lineHeight: a.lineHeight, letterSpacing: a.letterSpacing, textTransform: a.textTransform });
        break;
      case "icon":
        icons.push({ name: a.name, codepoint: a.codepoint, fontFamily: a.fontFamily, renderMode: a.renderMode });
        break;
      case "graphic":
        graphics.push({ filename: a.filename, extension: a.extension, sizeBytes: a.sizeBytes, assetPath: `assets/${a.filename}` });
        break;
      case "color":
        colors.push({ id: a.id, label: a.label, value: a.value });
        break;
    }
  }

  const hasAny = components.length + typography.length + icons.length + graphics.length + colors.length > 0;
  return hasAny ? { components, typography, icons, graphics, colors } : undefined;
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

  return { images, attachedElements, attachedAssets: buildAssetPayloads(attachments) };
}

export async function applyAgentModification(args: AgentModifyArgs): Promise<AgentModifyResult> {
  const fullHtml = args.getFullPageHTML?.();
  if (!fullHtml) return { error: "No page content available" };

  const { images, attachedElements, attachedAssets } = buildAttachmentPayloads(args.attachments);

  const unsubscribe = window.api.onAiAgentProgress((progress) => {
    if (progress.type === "html_update" && progress.html) args.onApply?.(progress.html, args.prompt);
  });

  try {
    const result = await window.api.aiAgentModify({
      prompt: args.prompt,
      fullHTML: fullHtml,
      attachedElements: attachedElements.length > 0 ? attachedElements : undefined,
      images: images.length > 0 ? images : undefined,
      attachedAssets,
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

