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
      description: "REQUIRED FIRST ACTION. Decompose the user's request into a concise list of concrete changes you intend to make. Keep it short (1-5 items). Each change is a brief sentence — you'll discover selectors and exact values during the INSPECT phase. Calling this tool transitions you from PLAN to INSPECT (or directly to MODIFY when mode='single-shot').",
      parameters: {
        type: "object",
        properties: {
          changes: {
            type: "string",
            description: 'JSON array of {target, action, approach?} objects. Example: [{"target":"SaaS label","action":"increase contrast against dark card background"},{"target":"card header layout","action":"place SaaS label above title instead of beside it"},{"target":"impact/effort row","action":"add small gap between the two pills"}]',
          },
          mode: {
            type: "string",
            enum: ["full", "single-shot"],
            description: 'Optional. Default "full" runs PLAN→INSPECT→MODIFY→VERIFY. Choose "single-shot" ONLY when ALL of these are true: (a) the request is a single trivial edit (text swap, one CSS property), (b) the exact target selector is already known (typically from an attached element), (c) the new value is unambiguous from the user prompt, (d) no inspection of surrounding structure is needed. Single-shot skips INSPECT and VERIFY — you go straight from planChanges to one edit tool to finish.',
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

    const singleShot = args.mode === "single-shot";

    context.setPlan?.(parsed);
    context.setSingleShot?.(singleShot);
    context.requestPhase?.(singleShot ? "MODIFY" : "INSPECT");

    const formatted = formatPlan(parsed);

    if (singleShot) {
      return `Plan accepted in SINGLE-SHOT mode (${parsed.length} change(s)):\n${formatted}\n\nNow in MODIFY phase. Apply the edit directly using the appropriate edit tool (e.g., editText, editCss, editAttribute), then call \`finish\`. INSPECT and VERIFY are skipped. If you realise mid-edit that you actually need to inspect first, call \`reinspect\` to drop into the full flow.`;
    }
    return `Plan accepted (${parsed.length} change(s)):\n${formatted}\n\nNow in INSPECT phase. Use read-only tools (searchHtml, searchCss, getElementInfo, takeScreenshot) — batch them in parallel — to gather everything you need for ALL planned changes. Call beginModify when ready.`;
  },
};

export const beginModify: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "beginModify",
      description: "Signal that inspection is complete and you have enough information to apply ALL planned changes. Transitions INSPECT → MODIFY. Only call once you understand the relevant selectors, classes, and current styles.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    context.requestPhase?.("MODIFY");
    return "Now in MODIFY phase. Apply your planned changes using edit tools. Batch related edits when possible (e.g., one editCss call with multiple rules). Call beginVerify when all edits are applied.";
  },
};

export const beginVerify: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "beginVerify",
      description: "Signal that all planned changes have been applied. Transitions MODIFY → VERIFY. After this, take a screenshot or inspect the modified elements to confirm correctness.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  async execute(_args: Record<string, unknown>, context: ToolContext): Promise<string> {
    context.requestPhase?.("VERIFY");
    return "Now in VERIFY phase. Take a screenshot and/or inspect the changed elements to confirm the result matches the plan. Call finish if correct, or reinspect / undo + reinspect if something is wrong.";
  },
};

export const reinspect: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "reinspect",
      description: "Return to INSPECT phase to gather more information. Use this if you realized mid-MODIFY or mid-VERIFY that you need to look up additional selectors, styles, or structure before continuing.",
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
    context.requestPhase?.("INSPECT");
    return `Back in INSPECT phase (reason: ${reason}). Gather what you need with read-only tools, then call beginModify to resume editing.`;
  },
};
