import type { ToolDefinition, ToolContext, PlannedChange } from "../agent-types";

function parsePlan(raw: unknown): { ok: true; plan: PlannedChange[] } | { ok: false; error: string } {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) throw new Error("changes must be a JSON array");
    return { ok: true, plan: value as PlannedChange[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function formatPlan(plan: PlannedChange[]): string {
  return plan
    .map((c, i) => `  ${i + 1}. [${c.target}] ${c.action}${c.approach ? ` — ${c.approach}` : ""}`)
    .join("\n");
}

export const planChanges: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "planChanges",
      description: "Decompose the user's request into a concise list of concrete changes you intend to make. Keep it short (1-5 items). Each change is a brief sentence — you may have inspected the page first, but exact selectors and values can still be discovered after planning. Stays in PLAN; the loop auto-flips to MODIFY when you call your first edit tool. For a single trivial edit where the exact target and value are already known, skip planChanges entirely and call the edit tool directly (single-shot mode — skips VERIFY).",
      parameters: {
        type: "object",
        properties: {
          changes: {
            type: "string",
            description: 'JSON array of {target, action, approach?} objects. Example: [{"target":"SaaS label","action":"increase contrast against dark card background"},{"target":"card header layout","action":"place SaaS label above title instead of beside it"},{"target":"impact/effort row","action":"add small gap between the two pills"}]',
          },
        },
        required: ["changes"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const result = parsePlan(args.changes);
    if (!result.ok) {
      return `Invalid plan: ${result.error}. Provide a JSON array of {target, action} objects.`;
    }
    const parsed = result.plan;
    if (parsed.length === 0) return "Plan must contain at least one change.";

    context.setPlan?.(parsed);

    const formatted = formatPlan(parsed);
    return `Plan accepted (${parsed.length} change(s)):\n${formatted}\n\nStill in PLAN phase. Use read-only tools (searchHtml, searchCss, getElementInfo, takeScreenshot) — batch them in parallel — to gather everything you need for ALL planned changes. When you're ready to edit, just call your edit tool — the loop will move you to MODIFY automatically. No separate transition tool is needed.`;
  },
};

export const reinspect: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "reinspect",
      description: "Return to PLAN phase to gather more information. Use this if you realized mid-MODIFY or mid-VERIFY that you need to look up additional selectors, styles, or structure before continuing.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Brief explanation of what you need to look up" },
        },
        required: ["reason"],
      },
    },
  },
  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const reason = (args.reason as string) || "unspecified";
    context.requestPhase?.("PLAN");
    return `Back in PLAN phase (reason: ${reason}). Gather what you need with read-only tools, then just call your edit tool to resume editing — the loop will move you to MODIFY automatically.`;
  },
};
