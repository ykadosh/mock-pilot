import type { ToolDefinition, ToolContext } from "../agent-types";

export const listIcons: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "listIcons",
      description: "List available icon libraries in the project. Returns library names that are loaded.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const assets = context.projectAssets;
    if (!assets?.icons?.libraries || assets.icons.libraries.length === 0) {
      return "No icon libraries registered in the project assets.";
    }

    const libs = assets.icons.libraries;
    return `Available icon libraries (${libs.length}):\n${libs.map(l => `- ${l}`).join("\n")}`;
  },
};
