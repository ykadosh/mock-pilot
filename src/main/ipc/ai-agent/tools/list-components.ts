import type { ToolDefinition, ToolContext } from "../agent-types";

export const listComponents: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "listComponents",
      description: "List reusable UI components identified in the page. Returns component names, selectors, and descriptions.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const assets = context.projectAssets;
    if (!assets?.components || assets.components.length === 0) {
      return "No components registered in the project assets.";
    }

    const components = assets.components.map((comp) => {
      const props = comp.props?.length ? `\n    Props: ${comp.props.map(p => `${p.name} (${p.type})`).join(", ")}` : "";
      return `- ${comp.name} [${comp.selector}]${comp.description ? `: ${comp.description}` : ""}${props}`;
    });

    return `Available components (${components.length}):\n${components.join("\n")}`;
  },
};
