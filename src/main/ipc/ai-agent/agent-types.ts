import type { CheerioAPI } from "cheerio";

export interface ToolContext {
  /** Cheerio instance loaded with the current HTML document */
  $: CheerioAPI;
  /** Returns the current full HTML from the cheerio instance */
  getHtml: () => string;
  /** Project assets (fonts, components, icons, colors) */
  projectAssets?: ProjectAssets;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Stack of HTML snapshots for undo support */
  snapshots: string[];
  /** Push a snapshot of the current state before a mutation */
  pushSnapshot: () => void;
  /** Phase control: requested by transition tools, consumed by the loop. */
  requestPhase?: (phase: AgentPhase) => void;
  /** Plan storage: set by planChanges, exposed for logging/UI. */
  setPlan?: (plan: PlannedChange[]) => void;
  /** Last iteration at which a screenshot was taken (per selector key). */
  lastScreenshotIteration?: Map<string, number>;
  /** Current iteration number, updated by the loop. */
  currentIteration?: number;
  /** Mark a plan item as verified-ok. */
  markItemVerified?: (index: number) => void;
  /** Mark a plan item as verification-failed (with reason). */
  markItemFailed?: (index: number, notes: string) => void;
  /** Read whether every plan item has been verified-ok. */
  allItemsVerified?: () => boolean;
  /** Get the currently-stored plan (set by planChanges). */
  getPlan?: () => PlannedChange[];
  /** Get indices of plan items not yet verified-ok. */
  getUnverifiedItems?: () => number[];
  /** Default selector for scoped operations (e.g., screenshot) when caller omits one. Comes from attachedElements. */
  defaultSelector?: string;
  /** Last iteration the agent inspected the changed area (screenshot or getElementInfo). For VERIFY gating. */
  lastInspectionIteration?: { value: number };
  /** Mark that an inspection happened in the current iteration. Called from screenshot/getElementInfo tools. */
  markInspection?: () => void;
  /** True when the agent chose mode:"single-shot" in planChanges — skips INSPECT and VERIFY phases. */
  singleShot?: { value: boolean };
  /** Set single-shot mode (called by planChanges). */
  setSingleShot?: (value: boolean) => void;
}

export interface ProjectAssets {
  typography?: { family: string; variants?: string[] }[];
  colors?: { name: string; value: string }[];
  components?: { name: string; selector: string; description?: string; props?: { name: string; type: string }[] }[];
  icons?: { libraries: string[] };
  fontFaceCss?: string;
}

export interface ToolDefinition {
  schema: ToolSchema;
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | object[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type AgentPhase = "PLAN" | "INSPECT" | "MODIFY" | "VERIFY";

export interface PhaseDefinition {
  name: AgentPhase;
  description: string;
  /** Tool names allowed during this phase. */
  allowedTools: string[];
  /** Phase names this phase can transition to (informational, used for prompts). */
  canTransitionTo: AgentPhase[];
}

export interface PlannedChange {
  /** What part of the UI is being changed (e.g., "SaaS label", "card layout"). */
  target: string;
  /** What change to apply (e.g., "increase contrast", "stack vertically"). */
  action: string;
  /** Brief notes on approach if helpful (optional). */
  approach?: string;
}

export interface AgentProgress {
  type: "tool_start" | "tool_end" | "iteration" | "complete" | "error" | "thinking" | "phase";
  toolName?: string;
  iteration?: number;
  maxIterations?: number;
  result?: string;
  error?: string;
  content?: string;
  phase?: AgentPhase;
  planTotal?: number;
  verifiedCount?: number;
}
