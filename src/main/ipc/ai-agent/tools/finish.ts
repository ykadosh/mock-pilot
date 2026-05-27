import type { ToolDefinition, ToolContext, PlannedChange } from "../agent-types";

const EVIDENCE_MIN_LENGTH = 20;
const INSPECTION_FRESHNESS = 3;

interface Verification {
  planItemIndex: number;
  status: "ok" | "wrong";
  evidence?: string;
  notes?: string;
}

function parseVerifications(raw: unknown): { ok: true; verifications: Verification[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, verifications: [] };
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(value)) throw new Error("verifications must be a JSON array");
    return { ok: true, verifications: value as Verification[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function checkInspectionFreshness(context: ToolContext): string | null {
  const lastInspect = context.lastInspectionIteration?.value;
  const currentIter = context.currentIteration ?? 0;
  if (lastInspect === undefined) return null;
  if (currentIter - lastInspect > INSPECTION_FRESHNESS) {
    return `Cannot finish — you haven't inspected the post-edit state recently (last inspection was ${currentIter - lastInspect} iteration(s) ago). Take a screenshot (omit selector to auto-scope to the attached element) or call getElementInfo on the changed area, then call finish again.`;
  }
  return null;
}

function checkAllItemsCovered(verifications: Verification[], plan: PlannedChange[]): string | null {
  const covered = new Set(verifications.map((v) => Number(v.planItemIndex)));
  for (let i = 0; i < plan.length; i++) {
    if (!covered.has(i)) {
      return `Missing verification for plan item ${i}: [${plan[i].target}] ${plan[i].action}. The verifications array must cover EVERY plan item (one entry per item, with status 'ok' or 'wrong').`;
    }
  }
  return null;
}

function validateOneVerification(v: Verification, plan: PlannedChange[]): string | null {
  const idx = Number(v.planItemIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= plan.length) {
    return `Invalid planItemIndex ${v.planItemIndex}. Valid range: 0..${plan.length - 1}.`;
  }
  if (v.status !== "ok" && v.status !== "wrong") {
    return `Invalid status "${v.status}" for item ${idx}. Must be "ok" or "wrong".`;
  }
  if (v.status === "ok") {
    const ev = (v.evidence || "").trim();
    if (ev.length < EVIDENCE_MIN_LENGTH) {
      return `Item ${idx} marked 'ok' but evidence is too short (need ≥${EVIDENCE_MIN_LENGTH} chars describing what you literally see in the screenshot/HTML). Do not paraphrase the plan — describe the actual rendered state.`;
    }
  }
  return null;
}

function validateVerifications(verifications: Verification[], plan: PlannedChange[], context: ToolContext): string | null {
  const hasOk = verifications.some((v) => v.status === "ok");
  if (hasOk) {
    const freshErr = checkInspectionFreshness(context);
    if (freshErr) return freshErr;
  }
  const coverageErr = checkAllItemsCovered(verifications, plan);
  if (coverageErr) return coverageErr;
  for (const v of verifications) {
    const err = validateOneVerification(v, plan);
    if (err) return err;
  }
  return null;
}

function formatWrongList(wrong: Verification[], plan: PlannedChange[]): string {
  return wrong.map((v) => {
    const idx = Number(v.planItemIndex);
    return `  ${idx}. [${plan[idx].target}] ${plan[idx].action} — notes: ${v.notes || "(none provided)"}`;
  }).join("\n");
}

function runFinishValidation(parsed: { verifications: Verification[] }, plan: PlannedChange[], context: ToolContext): string | null {
  if (parsed.verifications.length === 0) {
    const list = plan.map((p, i) => `  ${i}. [${p.target}] ${p.action}`).join("\n");
    return `Cannot finish — verifications array is missing. Provide one entry per plan item:\n${list}\n\nExample: verifications=[{"planItemIndex":0,"status":"ok","evidence":"…what you literally see…"}]`;
  }
  const validationErr = validateVerifications(parsed.verifications, plan, context);
  if (validationErr) return validationErr;
  const wrong = parsed.verifications.filter((v) => v.status === "wrong");
  if (wrong.length > 0) {
    const lines = formatWrongList(wrong, plan);
    return `Cannot finish — ${wrong.length} plan item(s) marked wrong:\n${lines}\n\nCall \`reinspect\` (or \`undo\` first if needed) to fix, re-apply the edits, take a fresh screenshot, then call finish again with all items 'ok'.`;
  }
  return null;
}

export const finish: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "finish",
      description: "Call this tool when you have applied all modifications AND inspected the result (screenshot or getElementInfo). For each plan item, include an entry in `verifications` with status 'ok' and concrete evidence describing what you literally see. If anything is wrong, include those items with status='wrong' and notes — finish will be rejected and you should reinspect/undo and re-edit. In single-shot mode, verifications can be omitted.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "A brief summary of all modifications made to the page." },
          verifications: { type: "string", description: 'REQUIRED when plan has items (unless single-shot). JSON array — ONE entry per plan item — of {planItemIndex, status, evidence?, notes?}. Example: [{"planItemIndex":0,"status":"ok","evidence":"SaaS label is on its own line above the title, with title rendered immediately below it"}]. For status="ok": evidence ≥20 chars describing the actual rendered state (not a paraphrase of the plan). For status="wrong": notes describing what is wrong. Past runs produced wrong results when this was rushed — describe what you literally see in the screenshot.' },
        },
        required: ["summary"],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const summary = args.summary as string;
    const singleShot = context.singleShot?.value === true;
    const plan = context.getPlan?.() ?? [];

    if (singleShot || plan.length === 0) return `__FINISH__:${summary}`;

    const parsed = parseVerifications(args.verifications);
    if (!parsed.ok) return `Invalid verifications: ${parsed.error}. Provide a JSON array of {planItemIndex, status, evidence?, notes?} — one entry per plan item.`;

    const err = runFinishValidation(parsed, plan, context);
    if (err) return err;

    for (const v of parsed.verifications) {
      context.markItemVerified?.(Number(v.planItemIndex));
    }

    return `__FINISH__:${summary}`;
  },
};
