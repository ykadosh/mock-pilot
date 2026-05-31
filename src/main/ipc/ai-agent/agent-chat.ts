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
    temperature: 0.2,
    parallel_tool_calls: true,
  };

  const response = await fetch("https://api.githubcopilot.com/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "Copilot-Integration-Id": "copilot-4-cli",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
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

export async function getAgentCredentials(): Promise<{ aiModel: string; apiToken: string }> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Please sign in with GitHub first.");
  const aiModel = getSelectedAiModel();
  const apiToken = await getAiApiToken(aiModel, token);
  return { aiModel, apiToken };
}
