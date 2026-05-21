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

function createContext(fullHTML: string, projectAssets?: ProjectAssets, signal?: AbortSignal): ToolContext {
  const $ = cheerio.load(fullHTML);
  return { $, getHtml: () => $.html(), projectAssets, signal };
}

interface ProcessToolCallsArgs {
  toolCalls: ToolCall[];
  messages: AgentMessage[];
  context: ToolContext;
  onProgress?: (p: AgentProgress) => void;
  signal?: AbortSignal;
}

async function processToolCalls(args: ProcessToolCallsArgs) {
  for (const toolCall of args.toolCalls) {
    if (args.signal?.aborted) return false;
    const result = await executeToolCall(toolCall, args.context, args.onProgress);
    args.messages.push({ role: "tool", tool_call_id: toolCall.id, content: result });
  }
  return true;
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

const INTERMEDIATE_PATTERNS = /\b(let me|i'll|i will|i need to|i'm going to|first,? i|now i|next,? i|now remove|now add|now edit|now update|now change|now replace|now delete|now modify|now create|now insert|now move|now set|now apply|now fix|now wrap|now look)\b|:\s*$/i;

function looksLikeIntermediateThought(content: string): boolean {
  if (!content || content.length < 10) return false;
  // Check explicit patterns
  if (INTERMEDIATE_PATTERNS.test(content)) return true;
  // If it does NOT contain past-tense completion language, it's likely intermediate
  const completionPatterns = /\b(done|complete|finished|applied|modified|updated|changed|removed|added|created|here'?s (a |the )?summary|successfully|all (changes|modifications))\b/i;
  return !completionPatterns.test(content);
}

async function runIteration(iter: IterationContext, iteration: number, maxIterations: number): Promise<AgentLoopResult | null> {
  log(`--- Iteration ${iteration}/${maxIterations} ---`);
  iter.onProgress?.({ type: "iteration", iteration, maxIterations });
  const response = await requestAgentChatCompletion({ messages: iter.messages, tools: iter.toolSchemas, aiModel: iter.aiModel, apiToken: iter.apiToken, signal: iter.signal });

  if (!response.tool_calls || response.tool_calls.length === 0) {
    const content = response.content || "";
    // If the response looks like an intermediate thought rather than a summary, nudge the agent to act
    if (looksLikeIntermediateThought(content)) {
      if (iteration < maxIterations) {
        log("Agent returned intermediate thought, nudging to continue:", content.slice(0, 100));
        iter.messages.push({ role: "assistant", content });
        iter.messages.push({ role: "user", content: "Please continue and use the available tools to make the changes you described. Do not just describe what you plan to do — actually do it." });
        return null;
      }
      // On last iteration with intermediate thought — treat as max iterations reached
      log("Agent returned intermediate thought on final iteration:", content.slice(0, 100));
      iter.messages.push({ role: "assistant", content });
      return { success: true, html: iter.context.getHtml(), summary: "Reached maximum iterations.", iterations: iteration, maxIterationsReached: true, messages: iter.messages };
    }
    log("Agent finished (no tool calls). Summary:", content.slice(0, 200));
    return { success: true, html: iter.context.getHtml(), summary: content || "Modifications complete.", iterations: iteration };
  }

  log(`Agent requested ${response.tool_calls.length} tool call(s):`, response.tool_calls.map(tc => tc.function.name).join(", "));
  if (response.content) iter.onProgress?.({ type: "thinking", content: response.content });
  iter.messages.push({ role: "assistant", content: response.content || undefined, tool_calls: response.tool_calls });
  const ok = await processToolCalls({ toolCalls: response.tool_calls, messages: iter.messages, context: iter.context, onProgress: iter.onProgress, signal: iter.signal });
  if (!ok) return { success: false, error: "Cancelled", iterations: iteration };
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
    const result = `Unknown tool: "${name}". Available tools: searchHtml, searchCss, getElementInfo, editHtml, editCss, addElement, removeElement, takeScreenshot, listFonts, listComponents, listIcons, getDesignTokens.`;
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
