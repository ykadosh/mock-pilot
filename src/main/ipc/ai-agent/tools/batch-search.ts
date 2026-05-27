/* eslint-disable max-lines */
import type { ToolDefinition, ToolContext } from "../agent-types";
import type { CheerioAPI } from "cheerio";
import { parseCssRules, matchRule } from "./css-parser";

function parseSelectors(raw: unknown): string[] | string {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== "string") return "selectors must be a JSON array of strings.";
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return "selectors must be a JSON array of strings.";
    return parsed.map(String);
  } catch {
    // Allow a comma-separated fallback for convenience
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function collectStyleBlocks($: CheerioAPI): string {
  const styleBlocks: string[] = [];
  $("style").each(function () {
    const content = $(this).html();
    if (content) styleBlocks.push(content);
  });
  return styleBlocks.join("\n");
}

export const batchSearchCss: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "batchSearchCss",
      description: "Search for CSS rules matching MULTIPLE selectors in one call. Returns one labeled block per selector. Prefer this over multiple searchCss calls — it's a single iteration instead of N.",
      parameters: {
        type: "object",
        properties: {
          selectors: { type: "string", description: 'JSON array of CSS selectors. Example: [".contentWrapper-1704",".css-1700",".css-1701"]' },
          property: { type: "string", description: "Optional CSS property name to filter by across ALL selectors (e.g., 'color')" },
        },
        required: ["selectors"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selectors = parseSelectors(args.selectors);
    if (typeof selectors === "string") return `Invalid input: ${selectors}`;
    if (selectors.length === 0) return "Provide at least one selector.";

    const property = args.property as string | undefined;
    const allCss = collectStyleBlocks(context.$);
    if (!allCss) return "No <style> blocks found in the document.";
    const rules = parseCssRules(allCss);

    const blocks = selectors.map((sel) => {
      const matches = rules.flatMap((rule) => matchRule(rule, sel.trim(), property));
      const header = `[selector "${sel}"${property ? ` property "${property}"` : ""}]`;
      if (matches.length === 0) return `${header} no matches`;
      return `${header} ${matches.length} match(es):\n${matches.join("\n")}`;
    });

    return `batchSearchCss results for ${selectors.length} selector(s):\n\n${blocks.join("\n\n")}`;
  },
};

interface SummarizeElementArgs {
  $: CheerioAPI;
  sel: string;
  limit: number;
  text?: string;
}

function summarizeElement({ $, sel, limit, text }: SummarizeElementArgs): string {
  let elements = $(sel);
  if (text) {
    elements = elements.filter(function () {
      return $(this).text().toLowerCase().includes(text.toLowerCase());
    });
  }
  const total = elements.length;
  const header = `[selector "${sel}"${text ? ` text "${text}"` : ""}]`;
  if (total === 0) return `${header} no matches`;

  const out: string[] = [];
  elements.slice(0, limit).each(function () {
    const html = $.html($(this)) || "";
    if (html.length > 10000) {
      const childCount = $(this).children().length;
      out.push(`[LARGE ELEMENT — ${html.length} chars, ${childCount} children. Use a more specific selector.]`);
    } else {
      out.push(html);
    }
  });
  return `${header} ${total} match(es), showing ${Math.min(total, limit)}:\n${out.map((r, i) => `(${i + 1}) ${r}`).join("\n")}`;
}

export const batchSearchHtml: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "batchSearchHtml",
      description: "Search HTML for MULTIPLE selectors in one call. Returns one labeled block per selector. Prefer this over multiple searchHtml calls.",
      parameters: {
        type: "object",
        properties: {
          selectors: { type: "string", description: 'JSON array of CSS selectors. Example: [".card",".badge","span.label"]' },
          text: { type: "string", description: "Optional text content to filter within ALL matched elements" },
          limit: { type: "string", description: "Max results to return per selector (default: 3)" },
        },
        required: ["selectors"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selectors = parseSelectors(args.selectors);
    if (typeof selectors === "string") return `Invalid input: ${selectors}`;
    if (selectors.length === 0) return "Provide at least one selector.";

    const text = args.text as string | undefined;
    const limit = parseInt(args.limit as string) || 3;

    const blocks = selectors.map((sel) => summarizeElement({ $: context.$, sel: sel.trim(), limit, text }));
    return `batchSearchHtml results for ${selectors.length} selector(s):\n\n${blocks.join("\n\n")}`;
  },
};

function summarizeInfo($: CheerioAPI, sel: string): string {
  const header = `[selector "${sel}"]`;
  const elements = $(sel);
  if (elements.length === 0) return `${header} no matches`;

  const el = elements.eq(0);
  const childDescriptors: string[] = [];
  el.children().each(function () {
    const child = $(this);
    const tag = (child.prop("tagName") || "").toLowerCase();
    const id = child.attr("id") ? `#${child.attr("id")}` : "";
    const cls = child.attr("class") ? `.${child.attr("class")!.split(/\s+/).join(".")}` : "";
    childDescriptors.push(`<${tag}${id}${cls}>`);
  });

  const directText = el.contents().filter(function () { return this.type === "text"; }).text().trim();
  const info = {
    tag: (el.prop("tagName") || "unknown").toLowerCase(),
    attributes: el.attr() || {},
    childrenCount: el.children().length,
    children: childDescriptors,
    directText: directText || "(none)",
    matchCount: elements.length,
  };
  return `${header}\n${JSON.stringify(info, null, 2)}`;
}

export const batchGetElementInfo: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "batchGetElementInfo",
      description: "Get element info (tag, attributes, children summary) for MULTIPLE selectors in one call. Inspects the first match for each selector. Prefer this over multiple getElementInfo calls.",
      parameters: {
        type: "object",
        properties: {
          selectors: { type: "string", description: 'JSON array of CSS selectors.' },
        },
        required: ["selectors"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selectors = parseSelectors(args.selectors);
    if (typeof selectors === "string") return `Invalid input: ${selectors}`;
    if (selectors.length === 0) return "Provide at least one selector.";
    context.markInspection?.();
    const blocks = selectors.map((sel) => summarizeInfo(context.$, sel.trim()));
    return `batchGetElementInfo results for ${selectors.length} selector(s):\n\n${blocks.join("\n\n")}`;
  },
};
