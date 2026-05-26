/* eslint-disable max-lines, complexity */
import * as cheerio from "cheerio";
import type { AgentMessage, AgentProgress, ToolCall, ToolContext, ProjectAssets } from "./agent-types";
import { AGENT_SYSTEM_PROMPT } from "./agent-system-prompt";
import { getToolSchemas, getToolExecutor } from "./tools";
import { requestAgentChatCompletion } from "./agent-chat";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent]", ...args);
}

export interface AgentLoopOptions {
  prompt: string;
  fullHTML: string;
  projectAssets?: ProjectAssets;
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { name: string; dataUrl: string }[];
  maxIterations?: number;
  signal?: AbortSignal;
  onProgress?: (progress: AgentProgress) => void;
  aiModel: string;
  apiToken: string;
  /** If provided, resume from these messages instead of starting fresh. */
  previousMessages?: AgentMessage[];
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

function createContext(fullHTML: string, projectAssets?: ProjectAssets, signal?: AbortSignal): ToolContext {
  const $ = cheerio.load(fullHTML);
  const snapshots: string[] = [];
  return {
    $,
    getHtml: () => $.html(),
    projectAssets,
    signal,
    snapshots,
    pushSnapshot: () => { snapshots.push($.html()); },
  };
}

// Tools that mutate the DOM — we snapshot before executing these
const MUTATION_TOOLS = new Set(["editHtml", "editInnerHtml", "editCss", "editText", "editAttribute", "addElement", "removeElement"]);

interface ProcessToolCallsArgs {
  toolCalls: ToolCall[];
  messages: AgentMessage[];
  context: ToolContext;
  onProgress?: (p: AgentProgress) => void;
  signal?: AbortSignal;
}

interface ProcessToolCallsResult {
  cancelled: boolean;
  finishSummary?: string;
}

async function processToolCalls(args: ProcessToolCallsArgs): Promise<ProcessToolCallsResult> {
  for (const toolCall of args.toolCalls) {
    if (args.signal?.aborted) return { cancelled: true };

    const toolName = toolCall.function.name;

    // Snapshot before mutation tools
    if (MUTATION_TOOLS.has(toolName)) {
      args.context.pushSnapshot();
    }

    const result = await executeToolCall(toolCall, args.context, args.onProgress);
    args.messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });

    // Check if this was the finish tool
    if (toolName === "finish" && result.startsWith(FINISH_PREFIX)) {
      return { cancelled: false, finishSummary: result.slice(FINISH_PREFIX.length) };
    }
  }
  return { cancelled: false };
}

interface IterationContext {
  messages: AgentMessage[];
  toolSchemas: ReturnType<typeof getToolSchemas>;
  context: ToolContext;
  aiModel: string;
  apiToken: string;
  signal?: AbortSignal;
  onProgress?: (p: AgentProgress) => void;
}

async function runIteration(iter: IterationContext, iteration: number, maxIterations: number): Promise<AgentLoopResult | null> {
  log(`--- Iteration ${iteration}/${maxIterations} ---`);
  iter.onProgress?.({ type: "iteration", iteration, maxIterations });
  const response = await requestAgentChatCompletion({ messages: iter.messages, tools: iter.toolSchemas, aiModel: iter.aiModel, apiToken: iter.apiToken, signal: iter.signal });

  if (!response.tool_calls || response.tool_calls.length === 0) {
    // No tool calls — the model should have called finish. Nudge it.
    const content = response.content || "";
    log("Agent responded without tool calls, nudging:", content.slice(0, 100));
    if (content) iter.onProgress?.({ type: "thinking", content });
    iter.messages.push({ role: "assistant", content });
    if (iteration < maxIterations) {
      iter.messages.push({ role: "user", content: "You must call the `finish` tool when you are done, or use tools to continue making changes. Do not respond with just text." });
      return null;
    }
    // Final iteration — treat as done with whatever we have
    return { success: true, html: iter.context.getHtml(), summary: content || "Reached maximum iterations.", iterations: iteration, maxIterationsReached: true, messages: iter.messages };
  }

  log(`Agent requested ${response.tool_calls.length} tool call(s):`, response.tool_calls.map(tc => tc.function.name).join(", "));
  if (response.content) iter.onProgress?.({ type: "thinking", content: response.content });
  iter.messages.push({ role: "assistant", content: response.content || undefined, tool_calls: response.tool_calls });

  const result = await processToolCalls({ toolCalls: response.tool_calls, messages: iter.messages, context: iter.context, onProgress: iter.onProgress, signal: iter.signal });

  if (result.cancelled) return { success: false, error: "Cancelled", iterations: iteration };

  if (result.finishSummary !== undefined) {
    log("Agent called finish. Summary:", result.finishSummary.slice(0, 200));
    return { success: true, html: iter.context.getHtml(), summary: result.finishSummary, iterations: iteration };
  }

  return null;
}

export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentLoopResult> {
  const { maxIterations = 20, signal, onProgress, aiModel, apiToken } = options;
  log("Starting agent loop");
  log("Prompt:", options.prompt);
  log("Model:", aiModel);
  log("HTML length:", options.fullHTML.length);
  log("Attached elements:", options.attachedElements?.length ?? 0);
  log("Images:", options.images?.length ?? 0);
  log("Continuing from previous:", Boolean(options.previousMessages));

  const context = createContext(options.fullHTML, options.projectAssets, signal);

  let messages: AgentMessage[];
  if (options.previousMessages && options.previousMessages.length > 0) {
    messages = [...options.previousMessages];
    messages.push({ role: "user", content: "Please continue making the changes. Pick up where you left off." });
  } else {
    const userContent = buildUserContent(options.prompt, options.attachedElements, options.images);
    messages = [
      { role: "system", content: AGENT_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];
  }

  const iter: IterationContext = { messages, toolSchemas: getToolSchemas(), context, aiModel, apiToken, signal, onProgress };

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal?.aborted) return { success: false, error: "Cancelled", iterations: iteration };
    const result = await runIteration(iter, iteration, maxIterations);
    if (result) {
      log("Loop complete. Success:", result.success, "| Iterations:", result.iterations, "| HTML length:", result.html?.length);
      return result;
    }
  }

  log("Max iterations reached");
  return { success: true, html: context.getHtml(), summary: "Reached maximum iterations.", iterations: maxIterations, maxIterationsReached: true, messages };
}

function buildUserContent(
  prompt: string,
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[],
  images?: { name: string; dataUrl: string }[],
): string | object[] {
  const parts: object[] = [];

  // Add images first
  if (images && images.length > 0) {
    for (const img of images) {
      parts.push({ type: "image_url", image_url: { url: img.dataUrl, detail: "low" } });
    }
  }

  // Build text content
  let text = `User request: ${prompt}`;

  if (attachedElements && attachedElements.length > 0) {
    text += "\n\nThe user has highlighted these specific elements for modification:";
    for (const el of attachedElements) {
      text += `\n\n--- Element (data-mp-id="${el.mpId}", selector: ${el.selector}) ---\n${el.outerHTML.slice(0, 1000)}`;
    }
  }

  if (parts.length > 0) {
    parts.push({ type: "text", text });
    return parts;
  }

  return text;
}

async function executeToolCall(toolCall: ToolCall, context: ToolContext, onProgress?: (progress: AgentProgress) => void): Promise<string> {
  const { name, arguments: argsStr } = toolCall.function;

  log(`  Tool: ${name} | Args: ${argsStr.slice(0, 200)}`);
  onProgress?.({ type: "tool_start", toolName: name });

  const executor = getToolExecutor(name);
  if (!executor) {
    const result = `Unknown tool: "${name}". Available tools: searchHtml, searchCss, getElementInfo, editHtml, editInnerHtml, editCss, editText, editAttribute, addElement, removeElement, undo, takeScreenshot, listFonts, listComponents, listIcons, getDesignTokens, finish.`;
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

  try {
    const result = await executor(args, context);
    log(`  Result (${result.length} chars): ${result.slice(0, 300)}`);
    onProgress?.({ type: "tool_end", toolName: name, result: result.slice(0, 200) });
    return result;
  } catch (e) {
    const result = `Tool "${name}" threw an error: ${e instanceof Error ? e.message : String(e)}`;
    log(`  Error: ${result}`);
    onProgress?.({ type: "tool_end", toolName: name, result });
    return result;
  }
}
