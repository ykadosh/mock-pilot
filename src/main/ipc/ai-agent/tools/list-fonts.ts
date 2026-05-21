import type { ToolDefinition, ToolContext } from "../agent-types";

export const listFonts: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "listFonts",
      description: "List available fonts in the project's design system. Returns font families and their variants.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const assets = context.projectAssets;
    if (!assets?.typography || assets.typography.length === 0) {
      return "No fonts registered in the project assets.";
    }

    const fonts = assets.typography.map((font) => {
      const variants = font.variants?.length ? ` (variants: ${font.variants.join(", ")})` : "";
      return `- ${font.family}${variants}`;
    });

    return `Available fonts (${fonts.length}):\n${fonts.join("\n")}`;
  },
};
