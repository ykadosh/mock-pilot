import type { AgentPhase, PhaseDefinition } from "./agent-types";

const INSPECT_TOOLS = [
  "searchHtml",
  "searchCss",
  "getElementInfo",
  "batchSearchHtml",
  "batchSearchCss",
  "batchGetElementInfo",
  "listFonts",
  "listComponents",
  "listIcons",
  "getDesignTokens",
  "takeScreenshot",
  "viewImage",
];

const MODIFY_TOOLS = [
  "editHtml",
  "editInnerHtml",
  "editCss",
  "editText",
  "editAttribute",
  "addElement",
  "removeElement",
  "saveAttachmentToAssets",
  "undo",
];

export const PHASES: Record<AgentPhase, PhaseDefinition> = {
  PLAN: {
    name: "PLAN",
    description: "Decompose the user request into a concise list of concrete changes by calling planChanges. For a single trivial edit where the exact target and value are already known (single-shot mode), skip planChanges and call the edit tool directly — the loop will auto-transition to MODIFY and skip VERIFY.",
    allowedTools: ["planChanges", ...MODIFY_TOOLS],
    canTransitionTo: ["INSPECT", "MODIFY"],
  },
  INSPECT: {
    name: "INSPECT",
    description: "Gather all information you need before making changes. Batch read-only tool calls in parallel (multiple tool_calls in a single response). When you have enough context, just call your edit tool — the loop will move you to MODIFY automatically.",
    allowedTools: [...INSPECT_TOOLS, ...MODIFY_TOOLS],
    canTransitionTo: ["MODIFY"],
  },
  MODIFY: {
    name: "MODIFY",
    description: "Apply the planned changes. Batch related edits in single tool calls when possible (e.g., one editCss call with multiple rules). After your last edit, take a screenshot — that moves you to VERIFY automatically. Call reinspect if you discover you need more information. (In single-shot mode — i.e., when you reached MODIFY directly from PLAN without calling planChanges — call finish directly after the edit; VERIFY is skipped.)",
    allowedTools: [...MODIFY_TOOLS, ...INSPECT_TOOLS, "reinspect", "finish"],
    canTransitionTo: ["VERIFY", "INSPECT"],
  },
  VERIFY: {
    name: "VERIFY",
    description: "Confirm the result is correct. Take a screenshot and/or inspect the changed elements. Then call `finish` with a `verifications` array — one entry per plan item with status 'ok' and concrete evidence describing what you literally see. If anything is wrong, mark those items 'wrong' and finish will reject; then reinspect / undo + reinspect, re-apply, and re-verify.",
    allowedTools: [...INSPECT_TOOLS, "undo", "reinspect", "finish"],
    canTransitionTo: ["INSPECT", "MODIFY"],
  },
};

/** Tools that are pure reads of the cheerio document (safe to run in parallel). */
export const READ_ONLY_TOOLS = new Set<string>([
  "searchHtml",
  "searchCss",
  "getElementInfo",
  "batchSearchHtml",
  "batchSearchCss",
  "batchGetElementInfo",
  "listFonts",
  "listComponents",
  "listIcons",
  "getDesignTokens",
  "viewImage",
]);

/** Tools that mutate the document (must snapshot first, must run sequentially). */
export const MUTATION_TOOLS = new Set<string>(
  MODIFY_TOOLS.filter((t) => t !== "undo" && t !== "saveAttachmentToAssets"),
);

/** Tools that transition between phases (the loop reads requestPhase from context). */
export const TRANSITION_TOOLS = new Set<string>(["planChanges", "reinspect"]);

export function isToolAllowedInPhase(phase: AgentPhase, toolName: string): boolean {
  // `finish` is always allowed as a final exit hatch, but the system prompt steers
  // the agent to call it only from VERIFY.
  if (toolName === "finish") return PHASES[phase].allowedTools.includes("finish");
  return PHASES[phase].allowedTools.includes(toolName);
}

export function describePhaseForError(phase: AgentPhase): string {
  const def = PHASES[phase];
  return `Current phase: ${phase}. Allowed tools: ${def.allowedTools.join(", ")}. ${def.description}`;
}
