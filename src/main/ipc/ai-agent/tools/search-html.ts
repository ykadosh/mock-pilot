import type { ToolDefinition, ToolContext } from "../agent-types";

export const searchHtml: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "searchHtml",
      description: "Search the HTML document by CSS selector or text content. Returns matching elements with their outerHTML. For MULTIPLE selectors in one call, prefer batchSearchHtml — it's one iteration instead of N.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to search for (e.g., '.card', '#header', 'table tr')" },
          text: { type: "string", description: "Optional text content to search for within matched elements" },
          limit: { type: "string", description: "Maximum number of results to return (default: 10)" },
        },
        required: ["selector"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const text = args.text as string | undefined;
    const limit = parseInt(args.limit as string) || 10;

    try {
      let elements = context.$(selector);

      if (text) {
        elements = elements.filter(function () {
          return context.$(this).text().toLowerCase().includes(text.toLowerCase());
        });
      }

      const total = elements.length;
      if (total === 0) return `No elements found matching selector "${selector}"${text ? ` with text "${text}"` : ""}.`;

      const results: string[] = [];
      elements.slice(0, limit).each(function () {
        const el = context.$(this);
        const html = context.$.html(el) || "";
        if (html.length > 10000) {
          const childCount = el.children().length;
          const tag = (el.prop("tagName") || "").toLowerCase();
          const id = el.attr("id") ? `#${el.attr("id")}` : "";
          const cls = el.attr("class") ? `.${el.attr("class")!.split(/\s+/).join(".")}` : "";
          results.push(`[LARGE ELEMENT: <${tag}${id}${cls}> — ${html.length} chars, ${childCount} children. Use a more specific selector to inspect its children individually, or use getElementInfo for a structural overview.]`);
        } else {
          results.push(html);
        }
      });

      const header = `Found ${total} element(s) matching "${selector}"${text ? ` with text "${text}"` : ""}. Showing ${Math.min(total, limit)}:\n`;
      return header + results.map((r, i) => `[${i + 1}] ${r}`).join("\n\n");
    } catch (e) {
      return `Error searching HTML: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
