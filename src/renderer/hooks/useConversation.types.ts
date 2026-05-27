export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "message" | "thinking" | "tool" | "done";
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | object[];
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActiveSessionState {
  meta: SessionMeta;
  displayMessages: ConversationMessage[];
  agentMessages: AgentMessage[];
}

export const DEFAULT_CONVERSATION_TITLE = "New conversation";

export function deriveSessionTitle(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return DEFAULT_CONVERSATION_TITLE;
  return clean.length > 40 ? `${clean.slice(0, 40).trimEnd()}…` : clean;
}
