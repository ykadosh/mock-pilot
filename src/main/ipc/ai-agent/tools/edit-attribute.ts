import type { ToolDefinition, ToolContext } from "../agent-types";
import type * as cheerio from "cheerio";

interface ApplyAllArgs {
  elements: cheerio.Cheerio<cheerio.AnyNode>;
  attribute: string;
  value: string | undefined;
  selector: string;
}

function applyToAll({ elements, attribute, value, selector }: ApplyAllArgs): string {
  if (value === undefined || value === "") {
    elements.removeAttr(attribute);
    return `Removed "${attribute}" from ${elements.length} element(s) matching "${selector}".`;
  }
  elements.attr(attribute, value);
  return `Set "${attribute}=${value}" on ${elements.length} element(s) matching "${selector}".`;
}

export const editAttribute: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "editAttribute",
      description: "Set or remove an attribute on an element. Cannot modify data-mp-id attributes.",
      parameters: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector of the element to modify" },
          attribute: { type: "string", description: "The attribute name to set or remove (e.g., 'class', 'href', 'src')" },
          value: { type: "string", description: "The new attribute value. Omit or set to empty string to remove the attribute." },
          index: { type: "string", description: "If selector matches multiple elements, which one to edit (0-based, default: 0). Use 'all' to apply to all matches." },
        },
        required: ["selector", "attribute"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const selector = args.selector as string;
    const attribute = args.attribute as string;
    const value = args.value as string | undefined;
    const indexArg = args.index as string | undefined;

    if (attribute === "data-mp-id") {
      return "Cannot modify data-mp-id attributes. These are reserved system identifiers.";
    }

    try {
      const elements = context.$(selector);
      if (elements.length === 0) return `No element found matching "${selector}".`;

      if (indexArg === "all") {
        return applyToAll({ elements, attribute, value, selector });
      }

      return applyToOne({ elements, attribute, value, selector, indexArg });
    } catch (e) {
      return `Error editing attribute: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

function applyToOne({ elements, attribute, value, selector, indexArg }: ApplyAllArgs & { indexArg: string | undefined }): string {
  const index = parseInt(indexArg || "0") || 0;
  if (index >= elements.length) return `Index ${index} out of range (found ${elements.length} elements).`;

  const el = elements.eq(index);
  if (value === undefined || value === "") {
    el.removeAttr(attribute);
    return `Removed "${attribute}" from "${selector}" (index ${index}).`;
  }

  el.attr(attribute, value);
  return `Set "${attribute}=${value}" on "${selector}" (index ${index}).`;
}
