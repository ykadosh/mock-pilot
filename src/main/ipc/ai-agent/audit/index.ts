import type { AgentMessage, AgentProgress } from "../agent-types";
import { requestAgentChatCompletion } from "../agent-chat";
import { collectAgentSource } from "./collect-source";
import { buildTracePayload } from "./build-trace-payload";
import { AUDITOR_SYSTEM_PROMPT } from "./audit-system-prompt";
import { writeAuditReport } from "./write-report";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[Audit]", ...args);
}

export interface RunAuditPassArgs {
  prompt: string;
  aiModel: string;
  apiToken: string;
  inputHtml: string;
  finalHtml: string | undefined;
  iterations: number;
  success: boolean;
  error?: string;
  maxIterationsReached?: boolean;
  totalMs: number;
  messages: AgentMessage[] | undefined;
  progressEvents: AgentProgress[];
  sessionId?: string;
}

function buildTraceArgs(args: RunAuditPassArgs) {
  return {
    prompt: args.prompt, aiModel: args.aiModel, inputHtml: args.inputHtml, finalHtml: args.finalHtml,
    iterations: args.iterations, success: args.success, error: args.error,
    maxIterationsReached: args.maxIterationsReached, totalMs: args.totalMs,
    messages: args.messages, progressEvents: args.progressEvents,
  };
}

function buildUserPrompt(sourceBlob: string, traceBlob: string): string {
  return [
    "Below is the agent's own source, followed by a single completed run trace.",
    "Produce the markdown critique exactly as specified in your system prompt.",
    "", "## Agent source", "", sourceBlob, "", "## Run trace", "", traceBlob,
  ].join("\n");
}

export async function runAuditPass(args: RunAuditPassArgs): Promise<void> {
  try {
    log(`Starting audit pass for session ${args.sessionId ?? "(none)"} (model=${args.aiModel}, iters=${args.iterations})`);
    const userContent = buildUserPrompt(collectAgentSource(), buildTracePayload(buildTraceArgs(args)));
    const start = Date.now();
    const result = await requestAgentChatCompletion({
      messages: [
        { role: "system", content: AUDITOR_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      tools: [],
      aiModel: args.aiModel,
      apiToken: args.apiToken,
    });
    log(`Auditor LLM call done in ${Date.now() - start}ms (${result.content.length} chars)`);
    writeAuditReport(result.content.trim() || "<auditor returned empty response>", args.sessionId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Audit] Audit pass failed:", err);
  }
}
