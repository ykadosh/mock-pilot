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
];

const MODIFY_TOOLS = [
  "editHtml",
  "editInnerHtml",
  "editCss",
  "editText",
  "editAttribute",
  "addElement",
  "removeElement",
  "undo",
];

export const PHASES: Record<AgentPhase, PhaseDefinition> = {
  PLAN: {
    name: "PLAN",
    description: "Decompose the user request into a concise list of concrete changes. You MUST call planChanges as your only action in this phase.",
    allowedTools: ["planChanges"],
    canTransitionTo: ["INSPECT"],
  },
  INSPECT: {
    name: "INSPECT",
    description: "Gather all information you need before making changes. Batch read-only tool calls in parallel (multiple tool_calls in a single response). Call beginModify once you have enough context to apply ALL planned changes.",
    allowedTools: [...INSPECT_TOOLS, "beginModify"],
    canTransitionTo: ["MODIFY"],
  },
  MODIFY: {
    name: "MODIFY",
    description: "Apply the planned changes. Batch related edits in single tool calls when possible (e.g., one editCss call with multiple rules). Call beginVerify when all changes are applied. Call reinspect if you discover you need more information. (In single-shot mode, call finish directly after the edit.)",
    allowedTools: [...MODIFY_TOOLS, "beginVerify", "reinspect", "finish"],
    canTransitionTo: ["VERIFY", "INSPECT"],
  },
  VERIFY: {
    name: "VERIFY",
    description: "Confirm the result is correct. Take a screenshot and/or inspect the changed elements. Call verifyPlanItem for EACH plan item (status 'ok' or 'wrong'). If anything is wrong, call reinspect or undo + reinspect, then re-verify. Call finish only after ALL items are verified 'ok'.",
    allowedTools: [...INSPECT_TOOLS, "undo", "reinspect", "verifyPlanItem", "finish"],
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
]);

/** Tools that mutate the document (must snapshot first, must run sequentially). */
export const MUTATION_TOOLS = new Set<string>(MODIFY_TOOLS.filter((t) => t !== "undo"));

/** Tools that transition between phases (the loop reads requestPhase from context). */
export const TRANSITION_TOOLS = new Set<string>(["planChanges", "beginModify", "beginVerify", "reinspect", "verifyPlanItem"]);

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
