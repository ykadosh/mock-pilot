import type { ToolDefinition, ToolContext } from "../agent-types";

export const removeElement: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "removeElement",
      description: "Remove element(s) from the document matching a CSS selector.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element(s) to remove" },
          index: { type: "string", description: "If selector matches multiple elements, which one to remove (0-based, default: 'all'). Use 'all' to remove all matches." },
        },
        required: ["selector"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const indexArg = (args.index as string) ?? "all";

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;

      if (indexArg === "all") {
        const count = elements.length;
        elements.remove();
        return `Removed ${count} element(s) matching "${selector}".`;
      }

      const index = parseInt(indexArg) || 0;
      if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

      elements.eq(index).remove();
      return `Removed element at index ${index} matching "${selector}" (${elements.length} total matches).`;
    } catch (e) {
      return `Error removing element: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
