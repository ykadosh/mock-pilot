import { ipcMain, type BrowserWindow } from "electron";
import { runAgentLoop, type AgentLoopOptions } from "./agent-loop";
import { getAgentCredentials } from "./agent-chat";
import { abortActiveAiRequest } from "../ai-shared";
import type { AgentMessage, AgentProgress } from "./agent-types";
import { runAuditPass } from "./audit";
import {
  type AgentModifyRequest,
  getMaxIterations,
  isAuditModeEnabled,
  logAgentRequest,
  logAgentResult,
  persistAgentMessages,
  pickContinueMode,
  resolvePreviousMessages,
} from "./agent-handler-helpers";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent]", ...args);
}

let activeAgentAbortController: AbortController | null = null;

function createProgressHandler(getMainWindow: () => BrowserWindow | null) {
  return (progress: AgentProgress) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send("ai-agent-progress", progress);
  };
}

interface BuildOptionsArgs {
  data: AgentModifyRequest;
  previousMessages: AgentMessage[];
  signal: AbortSignal;
  getMainWindow: () => BrowserWindow | null;
  aiModel: string;
  apiToken: string;
  recordedProgress: AgentProgress[];
}

function buildAgentLoopOptions({ data, previousMessages, signal, getMainWindow, aiModel, apiToken, recordedProgress }: BuildOptionsArgs): AgentLoopOptions {
  const hasPrevious = previousMessages.length > 0;
  const sendProgress = createProgressHandler(getMainWindow);
  return {
    prompt: data.prompt, fullHTML: data.fullHTML, projectAssets: data.projectAssets,
    attachedElements: data.attachedElements, images: data.images, attachedAssets: data.attachedAssets,
    projectId: data.projectId, maxIterations: getMaxIterations(), signal,
    onProgress: (progress) => { recordedProgress.push(progress); sendProgress(progress); },
    aiModel, apiToken,
    previousMessages: hasPrevious ? previousMessages : undefined,
    continueMode: pickContinueMode(hasPrevious, Boolean(data.continueFromMaxIterations)),
  };
}

function maybeRunAudit(args: { data: AgentModifyRequest; result: Awaited<ReturnType<typeof runAgentLoop>>; aiModel: string; apiToken: string; recordedProgress: AgentProgress[]; totalMs: number }): void {
  if (!isAuditModeEnabled()) return;
  const { data, result, aiModel, apiToken, recordedProgress, totalMs } = args;
  void runAuditPass({
    prompt: data.prompt, aiModel, apiToken, inputHtml: data.fullHTML, finalHtml: result.html,
    iterations: result.iterations, success: result.success, error: result.error,
    maxIterationsReached: result.maxIterationsReached, totalMs,
    messages: result.messages, progressEvents: recordedProgress, sessionId: data.sessionId,
  });
}

async function handleAgentModify(_event: Electron.IpcMainInvokeEvent, data: AgentModifyRequest, getMainWindow: () => BrowserWindow | null) {
  if (activeAgentAbortController) activeAgentAbortController.abort();
  const abortController = new AbortController();
  activeAgentAbortController = abortController;

  const { aiModel, apiToken } = await getAgentCredentials();
  const previousMessages = resolvePreviousMessages(data);
  logAgentRequest(data, previousMessages, log);

  const recordedProgress: AgentProgress[] = [];
  const options = buildAgentLoopOptions({ data, previousMessages, signal: abortController.signal, getMainWindow, aiModel, apiToken, recordedProgress });
  const start = Date.now();
  const result = await runAgentLoop(options);
  const totalMs = Date.now() - start;
  activeAgentAbortController = null;
  logAgentResult(result, data.fullHTML.length, log);
  persistAgentMessages({ projectId: data.projectId, sessionId: data.sessionId, messages: result.messages, log });
  maybeRunAudit({ data, result, aiModel, apiToken, recordedProgress, totalMs });

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
