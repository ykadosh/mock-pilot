import fs from "fs";
import type { AgentMessage, ProjectAssets } from "./agent-types";
import type { runAgentLoop, AgentLoopOptions } from "./agent-loop";
import { appSettingsPath } from "../../projects";
import { readSession, writeSession, upsertIndexEntry, type ConversationAgentMessage } from "../conversation-storage";

export interface AttachedAssetsPayload {
  components: { id: string; label: string; html: string; description?: string; props?: { name: string; type: string; description: string }[] }[];
  typography: { id: string; label: string; fontFamily: string; fontSize: string; fontWeight: string; fontStyle: string; lineHeight: string; letterSpacing: string; textTransform: string }[];
  icons: { name: string; codepoint: string; fontFamily: string; renderMode: "codepoint" | "ligature" }[];
  graphics: { filename: string; extension: string; sizeBytes: number; assetPath: string }[];
  colors: { id: string; label: string; value: string }[];
}

export interface AgentModifyRequest {
  prompt: string;
  fullHTML: string;
  projectId?: string;
  sessionId?: string;
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { id: string; name: string; dataUrl: string; mimeType: string; sizeBytes: number }[];
  attachedAssets?: AttachedAssetsPayload;
  projectAssets?: ProjectAssets;
  previousAgentMessages?: AgentMessage[];
  continueFromMaxIterations?: boolean;
}

function readSettings(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(appSettingsPath)) return null;
    return JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
  } catch { return null; }
}

export function getMaxIterations(): number | undefined {
  const s = readSettings();
  if (!s) return undefined;
  if (s.maxIterations === 0) return 999;
  if (typeof s.maxIterations === "number") return s.maxIterations;
  return undefined;
}

export function isAuditModeEnabled(): boolean {
  return readSettings()?.auditMode === true;
}

export function pickContinueMode(hasPrevious: boolean, fromMaxIterations: boolean): AgentLoopOptions["continueMode"] {
  if (!hasPrevious) return undefined;
  return fromMaxIterations ? "resume-max-iterations" : "new-prompt";
}

export function resolvePreviousMessages(data: AgentModifyRequest): AgentMessage[] {
  if (data.projectId && data.sessionId) {
    const session = readSession(data.projectId, data.sessionId);
    if (session && Array.isArray(session.agentMessages) && session.agentMessages.length > 0) {
      return session.agentMessages as AgentMessage[];
    }
  }
  return data.previousAgentMessages ?? [];
}

export function persistAgentMessages(args: { projectId: string | undefined; sessionId: string | undefined; messages: AgentMessage[] | undefined; log: (...a: unknown[]) => void }): void {
  const { projectId, sessionId, messages, log } = args;
  if (!projectId || !sessionId || !messages) return;
  try {
    const existing = readSession(projectId, sessionId);
    if (!existing) return;
    const next = { ...existing, agentMessages: messages as ConversationAgentMessage[], updatedAt: Date.now() };
    writeSession(projectId, next);
    upsertIndexEntry(projectId, { id: next.id, title: next.title, createdAt: next.createdAt, updatedAt: next.updatedAt });
  } catch (e) {
    log("Failed to persist agent messages:", e);
  }
}

export function logAgentRequest(data: AgentModifyRequest, previousMessages: AgentMessage[], log: (...a: unknown[]) => void): void {
  log("Received ai-agent-modify request");
  log("  Prompt:", data.prompt);
  log("  HTML length:", data.fullHTML.length);
  log("  Attached elements:", data.attachedElements?.length ?? 0);
  log("  Images:", data.images?.length ?? 0);
  log("  Previous agent messages:", previousMessages.length, previousMessages.length > 0 ? "(from disk or payload)" : "(none)");
  log("  Continue from max-iterations:", Boolean(data.continueFromMaxIterations));
}

export function logAgentResult(result: Awaited<ReturnType<typeof runAgentLoop>>, inputHtmlLen: number, log: (...a: unknown[]) => void): void {
  log("Agent result - success:", result.success, "| iterations:", result.iterations, "| html length:", result.html?.length);
  if (result.summary) log("  Summary:", result.summary);
  if (result.html) log("  HTML changed:", result.html !== "" && result.html.length !== inputHtmlLen);
}
