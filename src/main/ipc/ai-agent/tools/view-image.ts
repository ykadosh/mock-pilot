import type { ToolDefinition, ToolContext } from "../agent-types";

export const viewImage: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "viewImage",
      description: "Load an attached image's pixels into the conversation so you can analyze its contents (composition, colours, layout, text inside the image, etc.). Use ONLY when the user's request requires understanding what the image looks like (e.g., 'design based on this', 'redesign to match this screenshot', 'match the colour palette'). Do NOT use when the user just wants the image inserted into the page — use `saveAttachmentToAssets` for that. After this call, the image is visible in subsequent iterations.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "The id of the attached image (from the 'Attached images' list in the initial user message)." },
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
    if (!context.pushUserMessageParts) return "Image inspection is not available in this context.";

    context.pushUserMessageParts([
      { type: "image_url", image_url: { url: attachment.dataUrl, detail: "high" } },
      { type: "text", text: `^ Attached image (id="${id}", name="${attachment.name}", type=${attachment.mimeType}). Use it to inform your edits.` },
    ]);

    return `Loaded image "${attachment.name}" (id="${id}") into the conversation. It is now visible in the next user message and will remain in context for the rest of this run. Proceed with planning / inspecting / editing.`;
  },
};
