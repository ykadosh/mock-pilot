import type { ToolDefinition, ToolContext } from "../agent-types";

export const editHtml: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "editHtml",
      description: "Replace the outerHTML of an element matching a CSS selector. If the selector matches multiple elements, use the 'index' parameter to target a specific one.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element to replace" },
          newHtml: { type: "string", description: "The new HTML to replace the element with" },
          index: { type: "string", description: "If selector matches multiple elements, which one to replace (0-based, default: 0). Use 'all' to replace all matches." },
        },
        required: ["selector", "newHtml"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const newHtml = args.newHtml as string;
    const indexArg = args.index as string | undefined;

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;

      if (indexArg === "all") {
        const count = elements.length;
        elements.each(function () {
          context.$(this).replaceWith(newHtml);
        });
        return `Replaced ${count} element(s) matching "${selector}".`;
      }

      const index = parseInt(indexArg || "0") || 0;
      if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

      elements.eq(index).replaceWith(newHtml);
      return `Replaced element at index ${index} matching "${selector}" (${elements.length} total matches).`;
    } catch (e) {
      return `Error editing HTML: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
