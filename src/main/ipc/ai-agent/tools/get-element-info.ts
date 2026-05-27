import type { ToolDefinition, ToolContext } from "../agent-types";

function buildChildDescriptor(context: ToolContext, child: ReturnType<ToolContext["$"]>): string {
  const childTag = (child.prop("tagName") || "").toLowerCase();
  const childClass = child.attr("class") || "";
  const childId = child.attr("id") || "";
  let desc = `<${childTag}`;
  if (childId) desc += `#${childId}`;
  if (childClass) desc += `.${childClass.split(/\s+/).join(".")}`;
  return desc + ">";
}

export const getElementInfo: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "getElementInfo",
      description: "Get detailed information about a specific element: tag name, attributes, direct children summary, and text content. For MULTIPLE selectors in one call, prefer batchGetElementInfo.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector targeting a specific element" },
          index: { type: "string", description: "If selector matches multiple elements, which one to inspect (0-based, default: 0)" },
        },
        required: ["selector"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const index = parseInt(args.index as string) || 0;
    context.markInspection?.();

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;

      const el = elements.eq(index);
      const children: string[] = [];
      el.children().each(function () { children.push(buildChildDescriptor(context, context.$(this))); });

      const directText = el.contents().filter(function () { return this.type === "text"; }).text().trim();

      const info = {
        tag: (el.prop("tagName") || "unknown").toLowerCase(),
        attributes: el.attr() || {},
        childrenCount: el.children().length,
        children: children.slice(0, 20),
        directText: directText || "(none)",
        fullText: el.text().trim().slice(0, 10000) || "(none)",
        matchCount: elements.length,
      };

      return JSON.stringify(info, null, 2);
    } catch (e) {
      return `Error getting element info: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
