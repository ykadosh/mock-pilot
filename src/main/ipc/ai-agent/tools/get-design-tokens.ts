import type { ToolDefinition, ToolContext } from "../agent-types";

export const getDesignTokens: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "getDesignTokens",
      description: "Get design tokens (colors, fonts) from the project's design system.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const assets = context.projectAssets;
    if (!assets) return "No project assets available.";

    const sections: string[] = [];

    if (assets.colors && assets.colors.length > 0) {
      const colors = assets.colors.map((c) => `  - ${c.name}: ${c.value}`);
      sections.push(`Colors (${colors.length}):\n${colors.join("\n")}`);
    }

    if (assets.typography && assets.typography.length > 0) {
      const fonts = assets.typography.map((f) => `  - ${f.family}`);
      sections.push(`Fonts (${fonts.length}):\n${fonts.join("\n")}`);
    }

    if (sections.length === 0) return "No design tokens available in project assets.";

    return `Design Tokens:\n\n${sections.join("\n\n")}`;
  },
};
