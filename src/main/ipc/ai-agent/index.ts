/* eslint-disable complexity */
import { ipcMain, type BrowserWindow } from "electron";
import fs from "fs";
import { runAgentLoop, type AgentLoopOptions } from "./agent-loop";
import { getAgentCredentials } from "./agent-chat";
import { abortActiveAiRequest } from "../ai-shared";
import type { AgentMessage, AgentProgress, ProjectAssets } from "./agent-types";
import { appSettingsPath } from "../../projects";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[AI Agent]", ...args);
}

let activeAgentAbortController: AbortController | null = null;

interface AgentModifyRequest {
  prompt: string;
  fullHTML: string;
  projectId?: string;
  attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
  images?: { name: string; dataUrl: string }[];
  projectAssets?: ProjectAssets;
  /** Previous LLM conversation messages from the active session, sent to enable continuation. */
  previousAgentMessages?: AgentMessage[];
  /** If true, treat as max-iterations resume (synthetic continue + INSPECT). Else new-prompt continuation. */
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

async function handleAgentModify(_event: Electron.IpcMainInvokeEvent, data: AgentModifyRequest, getMainWindow: () => BrowserWindow | null) {
  if (activeAgentAbortController) activeAgentAbortController.abort();

  const abortController = new AbortController();
  activeAgentAbortController = abortController;

  log("Received ai-agent-modify request");
  log("  Prompt:", data.prompt);
  log("  HTML length:", data.fullHTML.length);
  log("  Attached elements:", data.attachedElements?.length ?? 0);
  log("  Images:", data.images?.length ?? 0);
  log("  Previous agent messages:", data.previousAgentMessages?.length ?? 0);
  log("  Continue from max-iterations:", Boolean(data.continueFromMaxIterations));

  const { aiModel, apiToken } = await getAgentCredentials();

  const hasPrevious = (data.previousAgentMessages?.length ?? 0) > 0;
  const continueMode = pickContinueMode(hasPrevious, Boolean(data.continueFromMaxIterations));

  const options: AgentLoopOptions = {
    prompt: data.prompt,
    fullHTML: data.fullHTML,
    projectAssets: data.projectAssets,
    attachedElements: data.attachedElements,
    images: data.images,
    maxIterations: getMaxIterations(),
    signal: abortController.signal,
    onProgress: createProgressHandler(getMainWindow),
    aiModel,
    apiToken,
    previousMessages: hasPrevious ? data.previousAgentMessages : undefined,
    continueMode,
  };

  const result = await runAgentLoop(options);
  activeAgentAbortController = null;

  log("Agent result - success:", result.success, "| iterations:", result.iterations, "| html length:", result.html?.length);
  if (result.summary) log("  Summary:", result.summary);
  if (result.html) {
    const changed = result.html !== data.fullHTML;
    log("  HTML changed:", changed, changed ? `(input: ${data.fullHTML.length}, output: ${result.html.length})` : "");
  }

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
