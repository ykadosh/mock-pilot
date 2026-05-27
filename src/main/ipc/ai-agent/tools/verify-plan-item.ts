import type { ToolDefinition, ToolContext, PlannedChange } from "../agent-types";

const EVIDENCE_MIN_LENGTH = 20;
const INSPECTION_FRESHNESS = 3;

function formatRemaining(plan: PlannedChange[], remaining: number[]): string {
  return remaining.map((i) => `  ${i}. [${plan[i].target}] ${plan[i].action}`).join("\n");
}

interface HandleArgs {
  index: number;
  label: string;
  notes?: string;
  evidence?: string;
  context: ToolContext;
  plan: PlannedChange[];
}

function handleOk({ index, label, evidence, context, plan }: HandleArgs): string {
  context.markItemVerified?.(index);
  const remaining = context.getUnverifiedItems?.() ?? [];
  const ev = evidence ? ` [evidence: "${evidence.slice(0, 100)}${evidence.length > 100 ? "..." : ""}"]` : "";
  if (remaining.length === 0) {
    return `✓ Item ${index} verified: ${label}.${ev} ALL plan items verified — you may now call \`finish\`.`;
  }
  return `✓ Item ${index} verified: ${label}.${ev} ${remaining.length} item(s) still unverified:\n${formatRemaining(plan, remaining)}`;
}

function handleWrong({ index, label, notes, context }: HandleArgs): string {
  context.markItemFailed?.(index, notes || "");
  return `✗ Item ${index} marked WRONG: ${label}. Notes: ${notes || "(none provided)"}. Next: call \`reinspect\` to gather more info, or \`undo\` to revert the bad edit and then \`reinspect\`. After fixing the edit, take a screenshot or inspect the result, then call \`verifyPlanItem\` again with status='ok'.`;
}

function validateInspectionFreshness(context: ToolContext): string | null {
  const lastInspect = context.lastInspectionIteration?.value;
  const currentIter = context.currentIteration ?? 0;
  if (lastInspect === undefined) return null;
  if (currentIter - lastInspect > INSPECTION_FRESHNESS) {
    return `Cannot verify yet — you haven't inspected the post-edit state recently (last inspection was ${currentIter - lastInspect} iteration(s) ago). Take a screenshot (omit selector to auto-scope to the attached element) or call getElementInfo on the changed area first.`;
  }
  return null;
}

function validateOkSubmission(context: ToolContext, index: number, evidence: string): string | null {
  const freshErr = validateInspectionFreshness(context);
  if (freshErr) return freshErr;
  if (!evidence || evidence.trim().length < EVIDENCE_MIN_LENGTH) {
    return `Cannot verify item ${index} as 'ok' — evidence is missing or too short (need ≥${EVIDENCE_MIN_LENGTH} chars describing what you literally see). Past runs produced wrong results because the agent skipped real verification. Look at the screenshot or call getElementInfo, then describe the actual state.`;
  }
  return null;
}

function validateIndex(args: Record<string, unknown>, plan: PlannedChange[]): { index: number; error?: string } {
  const index = parseInt(args.planItemIndex as string);
  if (isNaN(index) || index < 0 || index >= plan.length) {
    return { index, error: `Invalid planItemIndex ${args.planItemIndex}. Valid range: 0..${plan.length - 1}. Plan has ${plan.length} items.` };
  }
  return { index };
}

export const verifyPlanItem: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "verifyPlanItem",
      description: "Confirm or reject one planned change against the post-edit state. You MUST call this once per plan item (status 'ok') before `finish` is allowed. REQUIRES recent inspection (screenshot or getElementInfo within last 3 iterations). For status='ok', evidence is REQUIRED: literally describe what you see in the screenshot/HTML that confirms the change (e.g., 'SaaS text is on its own line above the title, with title rendered immediately below it'). Vague evidence like 'looks good' will be rejected. If you're unsure, set status='wrong' rather than guess.",
      parameters: {
        type: "object",
        properties: {
          planItemIndex: { type: "string", description: "0-based index of the plan item being verified" },
          status: { type: "string", description: "'ok' only if you have inspected the result and can describe the evidence; 'wrong' if it doesn't match the plan", enum: ["ok", "wrong"] },
          evidence: { type: "string", description: "REQUIRED when status='ok' (min 20 chars): concrete description of what you see that confirms the change. Describe the actual current state, NOT a paraphrase of the plan." },
          notes: { type: "string", description: "Required when status='wrong': what's wrong and what you'll do about it." },
        },
        required: ["planItemIndex", "status"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const status = args.status as "ok" | "wrong";
    const notes = (args.notes as string) || "";
    const evidence = (args.evidence as string) || "";

    const plan = context.getPlan?.() ?? [];
    const { index, error } = validateIndex(args, plan);
    if (error) return error;

    if (status === "ok") {
      const err = validateOkSubmission(context, index, evidence);
      if (err) return err;
    }

    const item = plan[index];
    const label = `[${item.target}] ${item.action}`;
    return status === "ok"
      ? handleOk({ index, label, evidence, context, plan })
      : handleWrong({ index, label, notes, context, plan });
  },
};
