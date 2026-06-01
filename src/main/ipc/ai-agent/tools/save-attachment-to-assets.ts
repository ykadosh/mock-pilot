import type { ToolDefinition, ToolContext } from "../agent-types";
import { saveDataUriToAssets } from "../../../assets";

function normalizeFilename(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trySave(assetsDir: string, dataUrl: string, filename: string | undefined): { ok: true; relativePath: string } | { ok: false; error: string } {
  try {
    const saved = saveDataUriToAssets(assetsDir, dataUrl, { filename });
    if (!saved) return { ok: false, error: "Could not parse image data." };
    return { ok: true, relativePath: saved.relativePath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const saveAttachmentToAssets: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "saveAttachmentToAssets",
      description: "Copy an attached image into the current project's assets/ folder so it can be referenced from the page HTML/CSS. Returns a relative path (e.g. \"assets/abc123.png\") that you can paste directly into an `<img src=\"…\">`, `background-image: url(\"…\")`, or other URL attribute. Idempotent — calling twice with the same image returns the same path. Use this BEFORE inserting the image into the page. Do NOT try to embed base64/data URLs directly in HTML.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The id of the attached image (from the 'Attached images' list in the initial user message)." },
          filename: { type: "string", description: "Optional filename to save as (e.g. 'hero.png'). Defaults to a content-addressed hash filename, which is usually fine." },
        },
        required: ["id"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const id = String(args.id || "").trim();
    if (!id) return "Missing required argument: id.";

    const attachment = context.getImageAttachment?.(id);
    if (!attachment) return `No attached image with id "${id}". Use one of the ids listed in the initial user message.`;

    const assetsDir = context.getProjectAssetsDir?.();
    if (!assetsDir) return "Cannot save attachment: no project is associated with this run.";

    const result = trySave(assetsDir, attachment.dataUrl, normalizeFilename(args.filename));
    if (!result.ok) return `Failed to save attachment "${id}": ${result.error}`;
    return `Saved image "${attachment.name}" (id="${id}") to "${result.relativePath}". Use this path directly in src="…" or url(…) — for example: <img src="${result.relativePath}" alt="${attachment.name}">.`;
  },
};
