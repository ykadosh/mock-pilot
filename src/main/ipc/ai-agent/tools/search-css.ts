import type { ToolDefinition, ToolContext } from "../agent-types";

interface CssRule {
  selector: string;
  body: string;
}

/**
 * Parses CSS text into individual rules, handling nested blocks (media queries, keyframes, etc.)
 */
function parseCssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  let i = 0;

  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    const braceStart = css.indexOf("{", i);
    if (braceStart === -1) break;

    const selector = css.slice(i, braceStart).trim();

    // Find matching closing brace (accounting for nested braces)
    let depth = 1;
    let j = braceStart + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }

    const body = css.slice(braceStart + 1, j - 1).trim();
    rules.push({ selector, body });
    i = j;
  }

  return rules;
}

function formatRule(selector: string, body: string): string {
  const declarations = body.split(";").filter(s => s.trim());
  return `${selector} {\n  ${declarations.map(s => s.trim()).join(";\n  ")};\n}`;
}

function matchNestedRules(atRule: CssRule, selector: string, property: string | undefined): string[] {
  const results: string[] = [];
  const nestedRules = parseCssRules(atRule.body);
  for (const nested of nestedRules) {
    if (!nested.selector.includes(selector)) continue;
    if (property && !nested.body.includes(property)) continue;
    const formatted = formatRule(nested.selector, nested.body).split("\n").join("\n  ");
    results.push(`${atRule.selector} {\n  ${formatted}\n}`);
  }
  return results;
}

function matchRule(rule: CssRule, selector: string, property: string | undefined): string[] {
  if (rule.selector.startsWith("@")) {
    if (rule.selector.includes(selector)) {
      if (!property || rule.body.includes(property)) {
        return [formatRule(rule.selector, rule.body)];
      }
    }
    return matchNestedRules(rule, selector, property);
  }

  if (!rule.selector.includes(selector)) return [];
  if (property && !rule.body.includes(property)) return [];
  return [formatRule(rule.selector, rule.body)];
}

export const searchCss: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "searchCss",
      description: "Search for CSS rules in <style> blocks that match a given selector or property. Returns the matching CSS rules, including rules inside @media and other at-rules.",
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
    const matches = rules.flatMap(rule => matchRule(rule, selector, property));

    if (matches.length === 0) {
      return `No CSS rules found matching selector "${selector}"${property ? ` with property "${property}"` : ""}.`;
    }

    return `Found ${matches.length} CSS rule(s) matching "${selector}":\n\n${matches.join("\n\n")}`;
  },
};
