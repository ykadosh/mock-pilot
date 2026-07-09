import type { AgentMessage, ToolCall, ToolSchema } from "./agent-types";
import { getSelectedAiModel, getAiApiToken } from "../ai-shared";
import { getToken } from "../../auth";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
}

interface AgentChatOptions {
  messages: AgentMessage[];
  tools: ToolSchema[];
  aiModel: string;
  apiToken: string;
  signal?: AbortSignal;
}

interface AgentChatResult {
  content: string;
  tool_calls?: ToolCall[];
}

export async function requestAgentChatCompletion(options: AgentChatOptions): Promise<AgentChatResult> {
  const { messages, tools, aiModel, apiToken, signal } = options;

  const body = {
    model: aiModel,
    messages: messages.map(formatMessage),
    tools,
    tool_choice: "required" as const,
    temperature: 0.2,
    parallel_tool_calls: true,
  };

  const bodyJson = JSON.stringify(body);
  logRequestSummary({ aiModel, messages: body.messages, tools, bodyBytes: bodyJson.length });

  const response = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "Copilot-Integration-Id": "copilot-4-cli",
    },
    body: bodyJson,
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    logRequestFailure({ status: response.status, body: text, requestBody: bodyJson, messages: body.messages, tools });
    throw new Error(`API error (${response.status}): ${text.slice(0, 500)}`);
  }

  const result = await response.json() as ChatCompletionResponse;
  const choice = result.choices?.[0];

  return {
    content: choice?.message?.content || "",
    tool_calls: choice?.message?.tool_calls,
  };
}

function formatMessage(msg: AgentMessage): object {
  if (msg.role === "tool") {
    return { role: "tool", tool_call_id: msg.tool_call_id, content: msg.content || "" };
  }
  if (msg.role === "assistant" && msg.tool_calls) {
    return { role: "assistant", content: msg.content || null, tool_calls: msg.tool_calls };
  }
  return { role: msg.role, content: msg.content };
}

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent Chat]", ...args);
}

function describeContent(content: unknown): string {
  if (typeof content === "string") return `text(${content.length} chars)`;
  if (content === null || content === undefined) return "null";
  if (Array.isArray(content)) {
    const parts = content.map((p) => {
      if (!p || typeof p !== "object") return typeof p;
      const part = p as { type?: string; text?: string; image_url?: { url?: string } };
      if (part.type === "text") return `text(${(part.text ?? "").length} chars)`;
      if (part.type === "image_url") {
        const url = part.image_url?.url ?? "";
        const isDataUrl = url.startsWith("data:");
        return `image_url(${isDataUrl ? `dataUrl ${url.length} chars` : url.slice(0, 60)})`;
      }
      return part.type ?? "unknown";
    });
    return `parts[${parts.join(", ")}]`;
  }
  return typeof content;
}

interface RequestSummaryArgs {
  aiModel: string;
  messages: object[];
  tools: ToolSchema[];
  bodyBytes: number;
}

function logRequestSummary({ aiModel, messages, tools, bodyBytes }: RequestSummaryArgs): void {
  log(`→ POST /chat/completions  model=${aiModel}  bodyBytes=${bodyBytes}  messages=${messages.length}  tools=${tools.length}`);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i] as { role?: string; content?: unknown; tool_calls?: unknown[]; tool_call_id?: string };
    const extras: string[] = [];
    if (m.tool_calls) extras.push(`tool_calls=${m.tool_calls.length}`);
    if (m.tool_call_id) extras.push(`tool_call_id=${m.tool_call_id}`);
    log(`   [${i}] role=${m.role} content=${describeContent(m.content)}${extras.length ? "  " + extras.join("  ") : ""}`);
  }
}

interface RequestFailureArgs {
  status: number;
  body: string;
  requestBody: string;
  messages: object[];
  tools: ToolSchema[];
}

function logRequestFailure({ status, body, requestBody, messages, tools }: RequestFailureArgs): void {
  log(`← FAIL  status=${status}  responseBodyBytes=${body.length}  requestBodyBytes=${requestBody.length}  messages=${messages.length}  tools=${tools.length}`);
  log(`   Response body: ${body.slice(0, 2000)}`);
}

export async function getAgentCredentials(): Promise<{ aiModel: string; apiToken: string }> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Please sign in with GitHub first.");
  const aiModel = getSelectedAiModel();
  const apiToken = await getAiApiToken(aiModel, token);
  return { aiModel, apiToken };
}
