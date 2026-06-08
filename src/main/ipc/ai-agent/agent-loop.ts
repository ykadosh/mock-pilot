/* eslint-disable max-lines, complexity */
import path from "node:path";
import * as cheerio from "cheerio";
import type { AgentMessage, AgentPhase, AgentProgress, PlannedChange, ToolCall, ToolContext, ProjectAssets } from "./agent-types";
import { AGENT_SYSTEM_PROMPT } from "./agent-system-prompt";
import { getToolSchemas, getToolExecutor } from "./tools";
import { requestAgentChatCompletion } from "./agent-chat";
import { MUTATION_TOOLS, READ_ONLY_TOOLS, PHASES, describePhaseForError, isToolAllowedInPhase } from "./agent-phases";
import { getProjectDir } from "../../projects";
import { readProjectDesign } from "../../project-design";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent]", ...args);
}

export interface AttachedAssetsPayload {
  components: { id: string; label: string; html: string; description?: string; props?: { name: string; type: string; description: string }[] }[];
  typography: { id: string; label: string; fontFamily: string; fontSize: string; fontWeight: string; fontStyle: string; lineHeight: string; letterSpacing: string; textTransform: string }[];
  icons: { name: string; codepoint: string; fontFamily: string; renderMode: "codepoint" | "ligature" }[];
  graphics: { filename: string; extension: string; sizeBytes: number; assetPath: string }[];
  colors: { id: string; label: string; value: string }[];
}

export interface AgentLoopOptions {
  prompt: string;
  fullHTML: string;
  projectAssets?: ProjectAssets;
  projectId?: string;
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { id: string; name: string; dataUrl: string; mimeType: string; sizeBytes: number }[];
  attachedAssets?: AttachedAssetsPayload;
  maxIterations?: number;
  signal?: AbortSignal;
  onProgress?: (progress: AgentProgress) => void;
  aiModel: string;
  apiToken: string;
  /** If provided, resume from these messages instead of starting fresh. */
  previousMessages?: AgentMessage[];
  /**
   * How to use previousMessages:
   * - "new-prompt" (default): append the current prompt as a new user turn, start in PLAN phase.
   * - "resume-max-iterations": append a synthetic "please continue" user turn, start in PLAN phase.
   * Ignored when previousMessages is empty.
   */
  continueMode?: "new-prompt" | "resume-max-iterations";
}

export interface AgentLoopResult {
  success: boolean;
  html?: string;
  summary?: string;
  error?: string;
  iterations: number;
  maxIterationsReached?: boolean;
  /** Conversation messages so far — returned when maxIterationsReached so the caller can resume. */
  messages?: AgentMessage[];
}

const FINISH_PREFIX = "__FINISH__:";

interface LoopState {
  phase: AgentPhase;
  plan: PlannedChange[];
  lastScreenshotIteration: Map<string, number>;
  currentIteration: number;
  /** Counts how many iterations were "wasted" (no-tool nudges, rejected tools) — for metrics. */
  nudgeCount: number;
  rejectedToolCount: number;
  verifiedItems: Set<number>;
  verificationFailures: { index: number; notes: string }[];
  /** Iteration at which the agent last inspected (screenshot/getElementInfo). For VERIFY gating. */
  lastInspectionIteration: number;
  /** When true (auto-set when the agent calls a MODIFY tool from PLAN without having planned), loop skips VERIFY — only MODIFY runs. */
  singleShot: boolean;
  /** Cumulative time spent waiting on LLM chat completions (ms). */
  llmMs: number;
  /** Cumulative time spent inside tool executors (ms). */
  toolMs: number;
  /** Per-tool aggregated stats. */
  toolStats: Map<string, { count: number; ms: number }>;
  /** True once any mutation tool has run. Used to drive MODIFY→VERIFY auto-transition. */
  hasMutated: boolean;
}

interface CreateContextArgs {
  state: LoopState;
  fullHTML: string;
  projectAssets?: ProjectAssets;
  signal?: AbortSignal;
  defaultSelector?: string;
  imageAttachments: Map<string, { name: string; mimeType: string; dataUrl: string }>;
  getMessages: () => AgentMessage[];
  projectId?: string;
}

function createContext({ state, fullHTML, projectAssets, signal, defaultSelector, imageAttachments, getMessages, projectId }: CreateContextArgs): ToolContext {
  const $ = cheerio.load(fullHTML);
  const snapshots: string[] = [];
  return {
    $,
    getHtml: () => $.html(),
    projectAssets,
    signal,
    snapshots,
    pushSnapshot: () => { snapshots.push($.html()); },
    requestPhase: (phase: AgentPhase) => { state.phase = phase; },
    setPlan: (plan: PlannedChange[]) => {
      state.plan = plan;
      state.verifiedItems = new Set();
      state.verificationFailures = [];
    },
    lastScreenshotIteration: state.lastScreenshotIteration,
    get currentIteration() { return state.currentIteration; },
    markItemVerified: (index: number) => { state.verifiedItems.add(index); },
    markItemFailed: (index: number, notes: string) => {
      state.verifiedItems.delete(index);
      state.verificationFailures.push({ index, notes });
    },
    allItemsVerified: () => state.plan.length > 0 && state.verifiedItems.size === state.plan.length,
    getPlan: () => state.plan,
    getUnverifiedItems: () => state.plan.map((_, i) => i).filter((i) => !state.verifiedItems.has(i)),
    defaultSelector,
    markInspection: () => { state.lastInspectionIteration = state.currentIteration; },
    get lastInspectionIteration() { return { value: state.lastInspectionIteration }; },
    get singleShot() { return { value: state.singleShot }; },
    setSingleShot: (value: boolean) => { state.singleShot = value; },
    getImageAttachment: (id: string) => imageAttachments.get(id) ?? null,
    pushUserMessageParts: (parts: object[]) => { getMessages().push({ role: "user", content: parts }); },
    getProjectAssetsDir: () => projectId ? path.join(getProjectDir(projectId), "assets") : null,
  };
}

interface ProcessToolCallsArgs {
  toolCalls: ToolCall[];
  messages: AgentMessage[];
  context: ToolContext;
  state: LoopState;
  onProgress?: (p: AgentProgress) => void;
  signal?: AbortSignal;
}

interface ProcessToolCallsResult {
  cancelled: boolean;
  finishSummary?: string;
  phaseChanged: boolean;
}

/**
 * Splits tool calls into batches: consecutive read-only tools execute in parallel,
 * mutations and others execute sequentially. This preserves observable ordering while
 * parallelising the expensive cheerio reads.
 */
function planExecution(toolCalls: ToolCall[]): ToolCall[][] {
  const batches: ToolCall[][] = [];
  let currentReadOnlyBatch: ToolCall[] = [];
  for (const tc of toolCalls) {
    if (READ_ONLY_TOOLS.has(tc.function.name)) {
      currentReadOnlyBatch.push(tc);
    } else {
      if (currentReadOnlyBatch.length > 0) { batches.push(currentReadOnlyBatch); currentReadOnlyBatch = []; }
      batches.push([tc]);
    }
  }
  if (currentReadOnlyBatch.length > 0) batches.push(currentReadOnlyBatch);
  return batches;
}

/** Tools that modify the document (snapshots are pushed for MUTATION_TOOLS; undo pops snapshots). */
const HTML_CHANGING_TOOLS = new Set<string>([...Array.from(MUTATION_TOOLS), "undo"]);

async function runSequentialBatch(executable: ToolCall[], args: ProcessToolCallsArgs, phaseChanged: boolean): Promise<ProcessToolCallsResult | null> {
  for (const tc of executable) {
    const toolName = tc.function.name;
    if (MUTATION_TOOLS.has(toolName)) args.context.pushSnapshot();
    const result = await executeToolCall({ toolCall: tc, context: args.context, state: args.state, onProgress: args.onProgress });
    if (HTML_CHANGING_TOOLS.has(toolName)) {
      args.state.hasMutated = true;
      args.onProgress?.({ type: "html_update", html: args.context.getHtml() });
    }
    if (toolName === "finish" && result.startsWith(FINISH_PREFIX)) {
      args.messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      return { cancelled: false, finishSummary: result.slice(FINISH_PREFIX.length), phaseChanged };
    }
    args.messages.push({ role: "tool", tool_call_id: tc.id, content: result + nextActionHint(toolName, args.state) });
  }
  return null;
}

async function runParallelReadOnlyBatch(executable: ToolCall[], args: ProcessToolCallsArgs): Promise<void> {
  log(`  [PARALLEL] Running ${executable.length} read-only tools in parallel`);
  const results = await Promise.all(executable.map((tc) => executeToolCall({ toolCall: tc, context: args.context, state: args.state, onProgress: args.onProgress })));
  for (let i = 0; i < executable.length; i++) {
    const toolName = executable[i].function.name;
    // Only append hint to the LAST result to avoid duplication
    const isLast = i === executable.length - 1;
    const content = isLast ? results[i] + nextActionHint(toolName, args.state) : results[i];
    args.messages.push({ role: "tool", tool_call_id: executable[i].id, content });
  }
}

/** Tools that, when called after a mutation in MODIFY, signal the agent is inspecting the result.
 *  Triggers MODIFY → VERIFY auto-transition. Broader than READ_ONLY_TOOLS because takeScreenshot
 *  is not a cheerio read (it renders the browser) but is still a verification action. */
const VERIFY_TRIGGER_TOOLS = new Set<string>([...Array.from(READ_ONLY_TOOLS), "takeScreenshot"]);

function maybeAutoTransition(toolName: string, state: LoopState): void {
  if (state.phase === "PLAN" && MUTATION_TOOLS.has(toolName)) {
    // Single-shot only when the agent jumped straight to an edit without recording a plan.
    const isSingleShot = state.plan.length === 0;
    log(`  [AUTO-TRANSITION] PLAN → MODIFY${isSingleShot ? " (single-shot, " : " ("}triggered by ${toolName})`);
    state.phase = "MODIFY";
    if (isSingleShot) state.singleShot = true;
  } else if (state.phase === "MODIFY" && state.hasMutated && VERIFY_TRIGGER_TOOLS.has(toolName) && !state.singleShot) {
    log(`  [AUTO-TRANSITION] MODIFY → VERIFY (triggered by ${toolName})`);
    state.phase = "VERIFY";
  }
}

function validateBatch(batch: ToolCall[], args: ProcessToolCallsArgs): ToolCall[] {
  const executable: ToolCall[] = [];
  for (const tc of batch) {
    const toolName = tc.function.name;
    maybeAutoTransition(toolName, args.state);
    if (!isToolAllowedInPhase(args.state.phase, toolName)) {
      args.state.rejectedToolCount++;
      const errorMsg = `Tool "${toolName}" is not allowed in phase ${args.state.phase}. ${describePhaseForError(args.state.phase)}`;
      log(`  [REJECTED] ${toolName} not allowed in ${args.state.phase}`);
      args.messages.push({ role: "tool", tool_call_id: tc.id, content: errorMsg });
      args.onProgress?.({ type: "tool_end", toolName, result: errorMsg.slice(0, 200) });
      continue;
    }
    executable.push(tc);
  }
  return executable;
}

async function processToolCalls(args: ProcessToolCallsArgs): Promise<ProcessToolCallsResult> {
  let phaseChanged = false;
  const batches = planExecution(args.toolCalls);

  for (const batch of batches) {
    if (args.signal?.aborted) return { cancelled: true, phaseChanged };

    const executable = validateBatch(batch, args);
    if (executable.length === 0) continue;

    const isParallelReadOnly = executable.length > 1 && executable.every((tc) => READ_ONLY_TOOLS.has(tc.function.name));
    if (isParallelReadOnly) {
      await runParallelReadOnlyBatch(executable, args);
    } else {
      const finished = await runSequentialBatch(executable, args, phaseChanged);
      if (finished) return finished;
    }

    phaseChanged = phaseChanged || executable.some((tc) => tc.function.name === "reinspect");
  }

  return { cancelled: false, phaseChanged };
}

interface IterationContext {
  messages: AgentMessage[];
  toolSchemas: ReturnType<typeof getToolSchemas>;
  context: ToolContext;
  state: LoopState;
  aiModel: string;
  apiToken: string;
  signal?: AbortSignal;
  onProgress?: (p: AgentProgress) => void;
}

function nudgeHintForPhase(phase: AgentPhase): string {
  switch (phase) {
    case "PLAN": return "Use read-only tools in parallel to gather any info you need, then call `planChanges` with a JSON array of {target, action} describing what you intend to change. Once planned, just call your edit tool — the loop will move you to MODIFY automatically. For a single trivial edit, you may skip `planChanges` and emit the edit tool and `finish` in the same response (single-shot — completes in one iteration, skips VERIFY).";
    case "MODIFY": return "Apply your planned edits (batch into the fewest tool calls). When done, take a screenshot — that moves you to VERIFY automatically.";
    case "VERIFY": return "Call `finish` directly, passing a `verifications` array (one entry per plan item: {planItemIndex, status:'ok', evidence}) describing what you literally see in the screenshot. Or `reinspect` if the result is wrong.";
  }
}

function nudgeMessageForPhase(phase: AgentPhase): string {
  const def = PHASES[phase];
  return `You must call at least one tool — text-only responses are not allowed. You are in phase ${phase}. ${nudgeHintForPhase(phase)} Allowed tools: ${def.allowedTools.join(", ")}.`;
}

async function runIteration(iter: IterationContext, iteration: number, maxIterations: number): Promise<AgentLoopResult | null> {
  iter.state.currentIteration = iteration;
  log(`--- Iteration ${iteration}/${maxIterations} [phase: ${iter.state.phase}] ---`);
  iter.onProgress?.({ type: "iteration", iteration, maxIterations, phase: iter.state.phase, planTotal: iter.state.plan.length, verifiedCount: iter.state.verifiedItems.size });

  const llmStart = Date.now();
  const response = await requestAgentChatCompletion({ messages: iter.messages, tools: iter.toolSchemas, aiModel: iter.aiModel, apiToken: iter.apiToken, signal: iter.signal });
  const llmMs = Date.now() - llmStart;
  iter.state.llmMs += llmMs;
  log(`  LLM: ${llmMs}ms`);

  if (!response.tool_calls || response.tool_calls.length === 0) {
    iter.state.nudgeCount++;
    const content = response.content || "";
    log(`Agent responded without tool calls (nudge #${iter.state.nudgeCount}), in phase ${iter.state.phase}:`, content.slice(0, 100));
    if (content) iter.onProgress?.({ type: "thinking", content });
    iter.messages.push({ role: "assistant", content });
    if (iteration < maxIterations) {
      iter.messages.push({ role: "user", content: nudgeMessageForPhase(iter.state.phase) });
      return null;
    }
    return { success: true, html: iter.context.getHtml(), summary: content || "Reached maximum iterations.", iterations: iteration, maxIterationsReached: true, messages: iter.messages };
  }

  const phaseBefore = iter.state.phase;
  log(`Agent requested ${response.tool_calls.length} tool call(s) in ${phaseBefore}:`, response.tool_calls.map(tc => tc.function.name).join(", "));
  if (response.content) iter.onProgress?.({ type: "thinking", content: response.content });
  iter.messages.push({ role: "assistant", content: response.content || undefined, tool_calls: response.tool_calls });

  const result = await processToolCalls({ toolCalls: response.tool_calls, messages: iter.messages, context: iter.context, state: iter.state, onProgress: iter.onProgress, signal: iter.signal });

  if (result.cancelled) return { success: false, error: "Cancelled", iterations: iteration, messages: iter.messages };

  if (iter.state.phase !== phaseBefore) {
    log(`Phase transition: ${phaseBefore} → ${iter.state.phase}`);
    iter.onProgress?.({ type: "phase", phase: iter.state.phase, planTotal: iter.state.plan.length, verifiedCount: iter.state.verifiedItems.size });
  }

  if (result.finishSummary !== undefined) {
    log("Agent called finish. Summary:", result.finishSummary.slice(0, 200));
    return { success: true, html: iter.context.getHtml(), summary: result.finishSummary, iterations: iteration, messages: iter.messages };
  }

  return null;
}

function buildSystemPrompt(projectId?: string): string {
  if (!projectId) return AGENT_SYSTEM_PROMPT;
  const design = readProjectDesign(projectId);
  if (!design) { log("Design spec: not active for project", projectId); return AGENT_SYSTEM_PROMPT; }
  log("Design spec: injecting", design.length, "chars into system prompt for project", projectId);
  return `${AGENT_SYSTEM_PROMPT}\n\n## Project Design System (design.md)\n\nThe following \`design.md\` describes this project's design language. Stay faithful to it when making visual or stylistic changes — colors, typography, spacing, component patterns, tone. Do not introduce off-brand styling. If the user's request conflicts with the spec, follow the user's explicit request but otherwise default to the spec.\n\n---\n${design}\n---\n`;
}

function initialMessages(options: AgentLoopOptions, isContinuation: boolean): AgentMessage[] {
  if (isContinuation) {
    const mode = options.continueMode ?? "new-prompt";
    if (mode === "resume-max-iterations") {
      return [
        ...options.previousMessages!,
        { role: "user", content: "Please continue making the changes. Pick up where you left off (currently in PLAN phase)." },
      ];
    }
    const userContent = buildUserContent(options.prompt, { attachedElements: options.attachedElements, images: options.images, attachedAssets: options.attachedAssets });
    return [
      ...options.previousMessages!,
      { role: "user", content: userContent },
    ];
  }
  const userContent = buildUserContent(options.prompt, { attachedElements: options.attachedElements, images: options.images, attachedAssets: options.attachedAssets });
  return [
    { role: "system", content: buildSystemPrompt(options.projectId) },
    { role: "user", content: userContent },
  ];
}

function logStart(options: AgentLoopOptions): void {
  log("Starting agent loop");
  log("Prompt:", options.prompt);
  log("Model:", options.aiModel);
  log("HTML length:", options.fullHTML.length);
  log("Attached elements:", options.attachedElements?.length ?? 0);
  log("Images:", options.images?.length ?? 0);
  log("Continuing from previous:", Boolean(options.previousMessages));
}

function buildImageAttachmentsMap(images: AgentLoopOptions["images"]): Map<string, { name: string; mimeType: string; dataUrl: string }> {
  const map = new Map<string, { name: string; mimeType: string; dataUrl: string }>();
  for (const img of images ?? []) {
    map.set(img.id, { name: img.name, mimeType: img.mimeType, dataUrl: img.dataUrl });
  }
  return map;
}

function createInitialState(initialPhase: AgentPhase): LoopState {
  return {
    phase: initialPhase,
    plan: [],
    lastScreenshotIteration: new Map(),
    currentIteration: 0,
    nudgeCount: 0,
    rejectedToolCount: 0,
    verifiedItems: new Set(),
    verificationFailures: [],
    lastInspectionIteration: -999,
    singleShot: false,
    llmMs: 0,
    toolMs: 0,
    toolStats: new Map(),
    hasMutated: false,
  };
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const { maxIterations = 20, signal, onProgress, aiModel, apiToken } = options;
  logStart(options);

  const isContinuation = Boolean(options.previousMessages && options.previousMessages.length > 0);
  const initialPhase: AgentPhase = "PLAN";
  const state = createInitialState(initialPhase);

  const messages = initialMessages(options, isContinuation);
  const context = createContext({
    state,
    fullHTML: options.fullHTML,
    projectAssets: options.projectAssets,
    signal,
    defaultSelector: options.attachedElements?.[0]?.selector,
    imageAttachments: buildImageAttachmentsMap(options.images),
    getMessages: () => messages,
    projectId: options.projectId,
  });
  const iter: IterationContext = { messages, toolSchemas: getToolSchemas(), context, state, aiModel, apiToken, signal, onProgress };

  const startTime = Date.now();
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal?.aborted) return { success: false, error: "Cancelled", iterations: iteration, messages };
    const result = await runIteration(iter, iteration, maxIterations);
    if (result) {
      logMetrics({ state, iterations: result.iterations, durationMs: Date.now() - startTime, result });
      return result;
    }
  }

  log("Max iterations reached");
  const result: AgentLoopResult = { success: true, html: context.getHtml(), summary: "Reached maximum iterations.", iterations: maxIterations, maxIterationsReached: true, messages };
  logMetrics({ state, iterations: maxIterations, durationMs: Date.now() - startTime, result });
  return result;
}

interface LogMetricsArgs {
  state: LoopState;
  iterations: number;
  durationMs: number;
  result: AgentLoopResult;
}

function logMetrics({ state, iterations, durationMs, result }: LogMetricsArgs): void {
  const llmMs = state.llmMs;
  const toolMs = state.toolMs;
  const otherMs = Math.max(0, durationMs - llmMs - toolMs);
  const pct = (n: number) => durationMs > 0 ? `${Math.round((n / durationMs) * 100)}%` : "—";
  log("==== Run metrics ====");
  log(`  Iterations:        ${iterations}`);
  log(`  Duration:          ${(durationMs / 1000).toFixed(1)}s`);
  log(`  LLM time:          ${(llmMs / 1000).toFixed(1)}s (${pct(llmMs)})`);
  log(`  Tool time:         ${(toolMs / 1000).toFixed(1)}s (${pct(toolMs)})`);
  log(`  Other/overhead:    ${(otherMs / 1000).toFixed(1)}s (${pct(otherMs)})`);
  if (state.toolStats.size > 0) {
    const sorted = Array.from(state.toolStats.entries()).sort((a, b) => b[1].ms - a[1].ms);
    log("  Tool breakdown:");
    for (const [name, s] of sorted) {
      log(`    ${name.padEnd(22)} ${s.count}× ${(s.ms / 1000).toFixed(1)}s (avg ${Math.round(s.ms / s.count)}ms)`);
    }
  }
  log(`  Final phase:       ${state.phase}`);
  log(`  Plan items:        ${state.plan.length}`);
  log(`  Nudges:            ${state.nudgeCount}`);
  log(`  Rejected tools:    ${state.rejectedToolCount}`);
  log(`  Success:           ${result.success}`);
  log(`  Max iters reached: ${Boolean(result.maxIterationsReached)}`);
}

function describeNode(el: cheerio.Element, $: cheerio.CheerioAPI): string | null {
  const $el = $(el);
  // Only direct text (not descendants' text) for clarity
  const ownText = $el.contents().filter((_, n) => n.type === "text").text().trim();
  if (!ownText) return null;
  const tag = el.tagName;
  const id = (el.attribs?.id) ? `#${el.attribs.id}` : "";
  const cls = (el.attribs?.class || "").split(/\s+/).filter(Boolean);
  // Prefer a class that looks identifying (not a utility hash like fk6fouc)
  const namedClass = cls.find((c) => /[a-z]+-\d+$/i.test(c) || /^scc-|^ms-/.test(c)) || cls[0] || "";
  const sel = `${tag}${id}${namedClass ? "." + namedClass : ""}`;
  return `  • ${sel} → ${JSON.stringify(ownText)}`;
}

function extractVisibleText(outerHTML: string): string[] {
  try {
    const $ = cheerio.load(outerHTML, null, false);
    const lines: string[] = [];
    $("*").each((_, el) => {
      if (el.type !== "tag") return;
      // Skip script/style
      if (el.tagName === "script" || el.tagName === "style") return;
      const line = describeNode(el, $);
      if (line) lines.push(line);
    });
    return lines;
  } catch {
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function buildAttachedAssetsText(assets: AttachedAssetsPayload): string {
  const parts: string[] = [];
  if (assets.components.length > 0) {
    parts.push("\n\nPinned components from the project library — reuse the EXACT HTML markup when the user asks to insert a component:");
    for (const c of assets.components) {
      parts.push(`\n--- Component "${c.label}" (id=${c.id}) ---`);
      if (c.description) parts.push(`Description: ${c.description}`);
      if (c.props && c.props.length > 0) parts.push(`Props: ${c.props.map((p) => `${p.name}:${p.type}`).join(", ")}`);
      parts.push(`HTML:\n${c.html}`);
    }
  }
  if (assets.typography.length > 0) {
    parts.push("\n\nPinned typography styles from the project — apply these as inline styles or CSS rules when the user asks for these text styles:");
    for (const t of assets.typography) {
      const name = t.label || t.fontFamily.split(",")[0].replace(/["']/g, "");
      parts.push(`- ${name}: font-family:${t.fontFamily}; font-size:${t.fontSize}; font-weight:${t.fontWeight}; font-style:${t.fontStyle}; line-height:${t.lineHeight}; letter-spacing:${t.letterSpacing}; text-transform:${t.textTransform};`);
    }
  }
  if (assets.icons.length > 0) {
    parts.push("\n\nPinned icons — use these glyphs (font-family + codepoint or ligature) when inserting icons:");
    for (const i of assets.icons) {
      parts.push(`- "${i.name}" font-family="${i.fontFamily}" codepoint=U+${i.codepoint.toUpperCase()} renderMode=${i.renderMode}`);
    }
  }
  if (assets.graphics.length > 0) {
    parts.push("\n\nPinned graphics — reference these files via their assetPath (e.g. <img src=\"<assetPath>\">):");
    for (const g of assets.graphics) {
      parts.push(`- ${g.filename} (${g.extension.toUpperCase()}, ${g.sizeBytes}B) → ${g.assetPath}`);
    }
  }
  if (assets.colors.length > 0) {
    parts.push("\n\nPinned colors from the project palette — use these exact values when the user asks for these colors:");
    for (const c of assets.colors) {
      parts.push(`- ${c.value}${c.label ? ` (${c.label})` : ""}`);
    }
  }
  return parts.join("\n");
}

interface BuildUserContentOptions {
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { id: string; name: string; dataUrl: string; mimeType: string; sizeBytes: number }[];
  attachedAssets?: AttachedAssetsPayload;
}

function buildUserContent(prompt: string, opts: BuildUserContentOptions = {}): string {
  const { attachedElements, images, attachedAssets } = opts;
  let text = `User request: ${prompt}`;

  if (attachedElements && attachedElements.length > 0) {
    text += "\n\nThe user has highlighted these specific elements for modification:";
    for (const el of attachedElements) {
      text += `\n\n--- Element (data-mp-id="${el.mpId}", selector: ${el.selector}) ---`;
      const visibleLines = extractVisibleText(el.outerHTML);
      if (visibleLines.length > 0) {
        text += `\nVisible text inside this element (selector → text):\n${visibleLines.join("\n")}`;
        text += `\nIf the user request mentions "text", "letters", "label", "title", "name", or similar, the target is almost certainly one of the items above — use editText on its selector.`;
      }
      text += `\nFull outerHTML:\n${el.outerHTML}`;
    }
  }

  if (images && images.length > 0) {
    text += "\n\nAttached images (metadata only — pixels are NOT yet loaded into context):";
    for (const img of images) {
      text += `\n  - id="${img.id}" name="${img.name}" type=${img.mimeType} size=${formatBytes(img.sizeBytes)}`;
    }
    text += "\nDecide from the request what to do with each image:";
    text += "\n  • To put the image INTO the page, call `saveAttachmentToAssets({id})` — it writes the file under the project's assets/ folder and returns a relative path like \"assets/abc.png\". Reference that path in your edit tools (e.g., addElement with `<img src=\"assets/abc.png\">`, or editCss with `background-image: url(\"assets/abc.png\")`). Do NOT embed base64/data URLs in HTML.";
    text += "\n  • To LOOK AT the image (because the request requires understanding its contents — design-from-image, \"make it look like this\", colour/layout inference, etc.), call `viewImage({id})`. It injects the pixels into the conversation from that iteration onward. Don't call this if the user just wants the image placed on the page.";
  }

  if (attachedAssets) text += buildAttachedAssetsText(attachedAssets);

  text += "\n\nBegin in PLAN: inspect what you need with read-only tools (batch in parallel), then call `planChanges` with a JSON array decomposing the request into concrete changes. For a single trivial edit where the target and value are already known, you may skip `planChanges` and emit the edit tool and `finish` in the same response (single-shot mode — completes in one iteration, skips VERIFY).";

  return text;
}

const HINT_SKIP_TOOLS = new Set(["planChanges", "reinspect", "finish"]);

function nextActionHint(toolName: string, state: LoopState): string {
  if (HINT_SKIP_TOOLS.has(toolName)) return "";

  switch (state.phase) {
    case "PLAN": {
      const planCount = state.plan.length;
      if (planCount === 0) {
        return "\n→ Next: inspect what you need (batch read-only tools in parallel), then call `planChanges` with your decomposed change list. OR — single-shot — skip planning and emit the edit tool + `finish` together in one response.";
      }
      const tip = planCount > 1
        ? " Tip: use batchSearchHtml/batchSearchCss/batchGetElementInfo to look up multiple selectors in ONE call."
        : "";
      return `\n→ Next: gather any remaining info (${planCount} plan item(s)), then call your edit tool directly — the loop will move you to MODIFY automatically.${tip}`;
    }
    case "MODIFY":
      return state.singleShot
        ? "\n→ Next: if the edit is complete, call `finish` directly (no verifications needed in single-shot mode). Otherwise apply the remaining edit(s)."
        : "\n→ Next: apply remaining edits (batch into the fewest editCss/editHtml calls). After your last edit, take a screenshot — that moves you to VERIFY automatically. Use `reinspect` if you need more info.";
    case "VERIFY": {
      const indices = state.plan.map((_, i) => i);
      const example = indices.length > 0
        ? `[${indices.map((i) => `{"planItemIndex":${i},"status":"ok","evidence":"…what you literally see…"}`).join(",")}]`
        : "[]";
      return `\n→ Next: call \`finish\` with a \`verifications\` array covering all ${indices.length} plan item(s). Example: verifications=${example}. Describe the actual rendered state, not a paraphrase of the plan.`;
    }
  }
}


function recordToolTiming(state: LoopState, name: string, ms: number): void {
  state.toolMs += ms;
  const prev = state.toolStats.get(name) || { count: 0, ms: 0 };
  prev.count += 1;
  prev.ms += ms;
  state.toolStats.set(name, prev);
}

interface ExecuteToolCallArgs {
  toolCall: ToolCall;
  context: ToolContext;
  state: LoopState;
  onProgress?: (progress: AgentProgress) => void;
}

async function executeToolCall({ toolCall, context, state, onProgress }: ExecuteToolCallArgs): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;

  log(`  Tool: ${name} | Args: ${argsStr.slice(0, 200)}`);
  onProgress?.({ type: "tool_start", toolName: name });

  const executor = getToolExecutor(name);
  if (!executor) {
    const result = `Unknown tool: "${name}".`;
    log(`  Result: ${result}`);
    onProgress?.({ type: "tool_end", toolName: name, result });
    return result;
  }

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr);
  } catch {
    const result = `Invalid JSON arguments for tool "${name}": ${argsStr}`;
    log(`  Result: ${result}`);
    onProgress?.({ type: "tool_end", toolName: name, result });
    return result;
  }

  const start = Date.now();
  try {
    const result = await executor(args, context);
    const ms = Date.now() - start;
    recordToolTiming(state, name, ms);
    log(`  Result (${result.length} chars, ${ms}ms): ${result.slice(0, 300)}`);
    onProgress?.({ type: "tool_end", toolName: name, result: result.slice(0, 200) });
    return result;
  } catch (e) {
    const ms = Date.now() - start;
    recordToolTiming(state, name, ms);
    const result = `Tool "${name}" threw an error: ${e instanceof Error ? e.message : String(e)}`;
    log(`  Error (${ms}ms): ${result}`);
    onProgress?.({ type: "tool_end", toolName: name, result });
    return result;
  }
}

