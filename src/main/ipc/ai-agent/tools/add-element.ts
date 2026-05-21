import type { ToolDefinition, ToolContext } from "../agent-types";

export const addElement: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "addElement",
      description: "Insert a new HTML element at a specific position relative to a target element.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the reference element" },
          position: { type: "string", description: "Where to insert relative to the reference: 'before', 'after', 'prepend' (first child), or 'append' (last child)", enum: ["before", "after", "prepend", "append"] },
          html: { type: "string", description: "The HTML to insert" },
          index: { type: "string", description: "If selector matches multiple elements, which one to use as reference (0-based, default: 0)" },
        },
        required: ["selector", "position", "html"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const position = args.position as "before" | "after" | "prepend" | "append";
    const html = args.html as string;
    const index = parseInt(args.index as string) || 0;

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;
      if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

      const target = elements.eq(index);

      switch (position) {
        case "before": target.before(html); break;
        case "after": target.after(html); break;
        case "prepend": target.prepend(html); break;
        case "append": target.append(html); break;
        default: return `Invalid position "${position}". Use before, after, prepend, or append.`;
      }

      return `Inserted HTML ${position} element matching "${selector}" (index ${index}).`;
    } catch (e) {
      return `Error adding element: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
