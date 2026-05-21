import type { ToolDefinition, ToolContext } from "../agent-types";

function findOrCreateStyleElement(context: ToolContext) {
  let styleEl = context.$("style").last();
  if (styleEl.length === 0) {
    let head = context.$("head");
    if (head.length === 0) {
      context.$("html").prepend("<head></head>");
      head = context.$("head");
    }
    head.append("<style></style>");
    styleEl = context.$("style").last();
  }
  return styleEl;
}

function removeCssRules(currentCss: string, targetSelector: string): string {
  const escaped = targetSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ruleRegex = new RegExp(`${escaped}\\s*\\{[^}]*\\}`, "g");
  return currentCss.replace(ruleRegex, "").trim();
}

export const editCss: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "editCss",
      description: "Add, modify, or remove CSS rules. Adds rules to an existing <style> block or creates one. To remove a rule, set the 'action' to 'remove'.",
      parameters: {
        type: "object",
        properties: {
          css: { type: "string", description: "CSS rule(s) to add or the full updated CSS block. Example: '.card { background: red; padding: 1rem; }'" },
          action: { type: "string", description: "Action to perform: 'add' appends new rules, 'replace' replaces rules for a selector, 'remove' removes rules for a selector", enum: ["add", "replace", "remove"] },
          targetSelector: { type: "string", description: "When action is 'replace' or 'remove', the CSS selector whose rules to target" },
        },
        required: ["css", "action"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const css = args.css as string;
    const action = args.action as "add" | "replace" | "remove";
    const targetSelector = args.targetSelector as string | undefined;

    try {
      const styleEl = findOrCreateStyleElement(context);
      const currentCss = styleEl.html() || "";

      if (action === "add") {
        styleEl.html(currentCss + "\n" + css);
        return `Added CSS rules:\n${css}`;
      }
      if (action === "replace" && targetSelector) {
        styleEl.html(removeCssRules(currentCss, targetSelector) + "\n" + css);
        return `Replaced CSS rules for "${targetSelector}" with:\n${css}`;
      }
      if (action === "remove" && targetSelector) {
        styleEl.html(removeCssRules(currentCss, targetSelector));
        return `Removed CSS rules for "${targetSelector}".`;
      }
      return `Invalid action "${action}" or missing targetSelector for replace/remove.`;
    } catch (e) {
      return `Error editing CSS: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
