import type { ToolDefinition, ToolContext } from "../agent-types";

export const editText: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "editText",
      description: "Set the text content of an element without modifying its structure, attributes, or children. Only changes the direct text nodes of the element.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element whose text to change" },
          newText: { type: "string", description: "The new text content" },
          index: { type: "string", description: "If selector matches multiple elements, which one to edit (0-based, default: 0)" },
        },
        required: ["selector", "newText"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const newText = args.newText as string;
    const index = parseInt(args.index as string) || 0;

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;
      if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

      const el = elements.eq(index);

      // If element has no children, just set text directly
      if (el.children().length === 0) {
        el.text(newText);
      } else {
        // Replace only direct text nodes, preserve child elements
        el.contents().filter(function () { return this.type === "text"; }).remove();
        el.prepend(newText);
      }

      return `Set text content of "${selector}" (index ${index}) to: "${newText.slice(0, 100)}${newText.length > 100 ? "..." : ""}"`;
    } catch (e) {
      return `Error editing text: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
