import type { ToolDefinition, ToolContext } from "../agent-types";
import { parseCssRules, matchRule } from "./css-parser";

export const searchCss: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "searchCss",
      description: "Search for CSS rules in <style> blocks that match a SINGLE selector or property. For MULTIPLE selectors in one call, use batchSearchCss instead — it's much faster than serial searchCss calls.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to search for in style rules (e.g., '.card', 'h1', '#nav', '@media')" },
          property: { type: "string", description: "Optional CSS property name to filter by (e.g., 'color', 'display')" },
        },
        required: ["selector"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = (args.selector as string).trim();
    const property = args.property as string | undefined;

    const styleBlocks: string[] = [];
    context.$("style").each(function () {
      const content = context.$(this).html();
      if (content) styleBlocks.push(content);
    });

    if (styleBlocks.length === 0) return "No <style> blocks found in the document.";

    const allCss = styleBlocks.join("\n");
    const rules = parseCssRules(allCss);
    const matches = rules.flatMap((rule) => matchRule(rule, selector, property));

    if (matches.length === 0) {
      return `No CSS rules found matching selector "${selector}"${property ? ` with property "${property}"` : ""}.`;
    }

    return `Found ${matches.length} CSS rule(s) matching "${selector}":\n\n${matches.join("\n\n")}`;
  },
};
