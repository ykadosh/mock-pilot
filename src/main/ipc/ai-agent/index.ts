import { ipcMain, type BrowserWindow } from "electron";
import fs from "fs";
import { runAgentLoop, type AgentLoopOptions } from "./agent-loop";
import { getAgentCredentials } from "./agent-chat";
import { abortActiveAiRequest } from "../ai-shared";
import type { AgentMessage, AgentProgress, ProjectAssets } from "./agent-types";
import { appSettingsPath } from "../../projects";
import { readSession, writeSession, upsertIndexEntry, type ConversationAgentMessage } from "../conversation-storage";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent]", ...args);
}

let activeAgentAbortController: AbortController | null = null;

interface AttachedAssetsPayload {
  components: { id: string; label: string; html: string; description?: string; props?: { name: string; type: string; description: string }[] }[];
  typography: { id: string; label: string; fontFamily: string; fontSize: string; fontWeight: string; fontStyle: string; lineHeight: string; letterSpacing: string; textTransform: string }[];
  icons: { name: string; codepoint: string; fontFamily: string; renderMode: "codepoint" | "ligature" }[];
  graphics: { filename: string; extension: string; sizeBytes: number; assetPath: string }[];
  colors: { id: string; label: string; value: string }[];
}

interface AgentModifyRequest {
  prompt: string;
  fullHTML: string;
  projectId?: string;
  sessionId?: string;
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { id: string; name: string; dataUrl: string; mimeType: string; sizeBytes: number }[];
  attachedAssets?: AttachedAssetsPayload;
  projectAssets?: ProjectAssets;
  /** Previous LLM conversation messages from the active session, sent to enable continuation. */
  previousAgentMessages?: AgentMessage[];
  /** If true, treat as max-iterations resume (synthetic continue). Else new-prompt continuation. */
  continueFromMaxIterations?: boolean;
}

function createProgressHandler(getMainWindow: () => BrowserWindow | null) {
  return (progress: AgentProgress) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("ai-agent-progress", progress);
  };
}

function getMaxIterations(): number | undefined {
  try {
    if (fs.existsSync(appSettingsPath)) {
      const settings = JSON.parse(fs.readFileSync(appSettingsPath, "utf-8"));
      if (settings.maxIterations === 0) return 999;
      if (settings.maxIterations) return settings.maxIterations;
    }
  } catch { /* use default */ }
  return undefined;
}

function pickContinueMode(hasPrevious: boolean, fromMaxIterations: boolean): AgentLoopOptions["continueMode"] {
  if (!hasPrevious) return undefined;
  return fromMaxIterations ? "resume-max-iterations" : "new-prompt";
}

/**
 * Resolve previous agent messages by loading them from disk when a session is identified.
 * Disk is the source of truth — falling back to the renderer-supplied list keeps backwards
 * compatibility for callers that don't pass a sessionId.
 */
function resolvePreviousMessages(data: AgentModifyRequest): AgentMessage[] {
  if (data.projectId && data.sessionId) {
    const session = readSession(data.projectId, data.sessionId);
    if (session && Array.isArray(session.agentMessages) && session.agentMessages.length > 0) {
      return session.agentMessages as AgentMessage[];
    }
  }
  return data.previousAgentMessages ?? [];
}

function persistAgentMessages(projectId: string | undefined, sessionId: string | undefined, messages: AgentMessage[] | undefined) {
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

function logAgentRequest(data: AgentModifyRequest, previousMessages: AgentMessage[]): void {
  log("Received ai-agent-modify request");
  log("  Prompt:", data.prompt);
  log("  HTML length:", data.fullHTML.length);
  log("  Attached elements:", data.attachedElements?.length ?? 0);
  log("  Images:", data.images?.length ?? 0);
  log("  Previous agent messages:", previousMessages.length, previousMessages.length > 0 ? "(from disk or payload)" : "(none)");
  log("  Continue from max-iterations:", Boolean(data.continueFromMaxIterations));
}

function logAgentResult(result: Awaited<ReturnType<typeof runAgentLoop>>, inputHtmlLen: number): void {
  log("Agent result - success:", result.success, "| iterations:", result.iterations, "| html length:", result.html?.length);
  if (result.summary) log("  Summary:", result.summary);
  if (result.html) {
    const changed = result.html !== "";
    log("  HTML changed:", changed && result.html.length !== inputHtmlLen);
  }
}

interface BuildOptionsArgs {
  data: AgentModifyRequest;
  previousMessages: AgentMessage[];
  signal: AbortSignal;
  getMainWindow: () => BrowserWindow | null;
  aiModel: string;
  apiToken: string;
}

function buildAgentLoopOptions({ data, previousMessages, signal, getMainWindow, aiModel, apiToken }: BuildOptionsArgs): AgentLoopOptions {
  const hasPrevious = previousMessages.length > 0;
  return {
    prompt: data.prompt,
    fullHTML: data.fullHTML,
    projectAssets: data.projectAssets,
    attachedElements: data.attachedElements,
    images: data.images,
    attachedAssets: data.attachedAssets,
    projectId: data.projectId,
    maxIterations: getMaxIterations(),
    signal,
    onProgress: createProgressHandler(getMainWindow),
    aiModel,
    apiToken,
    previousMessages: hasPrevious ? previousMessages : undefined,
    continueMode: pickContinueMode(hasPrevious, Boolean(data.continueFromMaxIterations)),
  };
}

async function handleAgentModify(_event: Electron.IpcMainInvokeEvent, data: AgentModifyRequest, getMainWindow: () => BrowserWindow | null) {
  if (activeAgentAbortController) activeAgentAbortController.abort();
  const abortController = new AbortController();
  activeAgentAbortController = abortController;

  const { aiModel, apiToken } = await getAgentCredentials();
  const previousMessages = resolvePreviousMessages(data);
  logAgentRequest(data, previousMessages);

  const options = buildAgentLoopOptions({ data, previousMessages, signal: abortController.signal, getMainWindow, aiModel, apiToken });
  const result = await runAgentLoop(options);
  activeAgentAbortController = null;
  logAgentResult(result, data.fullHTML.length);

  // Persist agent messages to disk in main process so we don't depend on the renderer
  // staying mounted to save them.
  persistAgentMessages(data.projectId, data.sessionId, result.messages);

  if (!result.success) return { success: false, error: result.error || "Agent loop failed", messages: result.messages };
  return { success: true, html: result.html, summary: result.summary, iterations: result.iterations, maxIterationsReached: result.maxIterationsReached, messages: result.messages };
}

export function registerAgentHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle("ai-agent-modify", async (event, data: AgentModifyRequest) => {
    try {
      return await handleAgentModify(event, data, getMainWindow);
    } catch (error: unknown) {
      activeAgentAbortController = null;
      if (error instanceof Error && error.name === "AbortError") return { success: false, error: "Cancelled" };
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

  ipcMain.handle("ai-agent-cancel", () => {
    if (activeAgentAbortController) { activeAgentAbortController.abort(); activeAgentAbortController = null; }
    abortActiveAiRequest();
    return { success: true };
  });
}
