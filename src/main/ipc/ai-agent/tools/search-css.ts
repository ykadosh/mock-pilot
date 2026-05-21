import type { ToolDefinition, ToolContext } from "../agent-types";

export const searchCss: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "searchCss",
      description: "Search for CSS rules in <style> blocks that match a given selector or property. Returns the matching CSS rules.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to search for in style rules (e.g., '.card', 'h1', '#nav')" },
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
    // Simple regex-based CSS rule parsing
    const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
    const matches: string[] = [];

    let match;
    while ((match = ruleRegex.exec(allCss)) !== null) {
      const ruleSelector = match[1].trim();
      const ruleBody = match[2].trim();

      if (!ruleSelector.includes(selector)) continue;
      if (property && !ruleBody.includes(property)) continue;

      matches.push(`${ruleSelector} {\n  ${ruleBody.split(";").filter(Boolean).map(s => s.trim()).join(";\n  ")};\n}`);
    }

    if (matches.length === 0) {
      return `No CSS rules found matching selector "${selector}"${property ? ` with property "${property}"` : ""}.`;
    }

    return `Found ${matches.length} CSS rule(s) matching "${selector}":\n\n${matches.join("\n\n")}`;
  },
};
