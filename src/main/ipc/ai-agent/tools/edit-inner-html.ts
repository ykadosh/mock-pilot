import type { ToolDefinition, ToolContext } from "../agent-types";

export const editInnerHtml: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "editInnerHtml",
      description: "Replace the inner HTML (children) of an element matching a CSS selector, preserving the element itself and its attributes. Use this when you want to set all children of an element at once.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element whose children to replace" },
          innerHTML: { type: "string", description: "The new inner HTML content to set as the element's children" },
          index: { type: "string", description: "If selector matches multiple elements, which one to modify (0-based, default: 0)" },
        },
        required: ["selector", "innerHTML"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const innerHTML = args.innerHTML as string;
    const index = parseInt(args.index as string) || 0;

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;
      if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

      const el = elements.eq(index);
      el.html(innerHTML);
      return `Set innerHTML of "${selector}" (index ${index}). Element now has ${el.children().length} direct children.`;
    } catch (e) {
      return `Error editing innerHTML: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
