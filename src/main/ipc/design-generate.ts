import type { BrowserWindow } from "electron";

import { writeProjectDesign } from "../project-design";
import { getToken } from "../auth";
import { getSelectedAiModel, getAiApiToken } from "./ai-shared";
import { buildGenerationUserMessage, loadAssets, loadHtml, stripCodeFences } from "./design-context";
import { streamDesignCompletion } from "./design-stream";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[Design]", ...args);
}

export type DesignGenerationStage = "preparing" | "prompting" | "streaming" | "saving" | "complete" | "error";

export interface DesignGenerationProgress {
  projectId: string;
  stage: DesignGenerationStage;
  message?: string;
  content?: string;
  error?: string;
}

export type GetMainWindow = () => BrowserWindow | null;

export function emitProgress(getWin: GetMainWindow, progress: DesignGenerationProgress) {
  const win = getWin();
  if (win && !win.isDestroyed()) win.webContents.send("design-generation-progress", progress);
}

async function prepareGeneration(id: string, getWin: GetMainWindow) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated. Please sign in with GitHub first.");
  emitProgress(getWin, { projectId: id, stage: "preparing", message: "Loading captured assets…" });
  log("Preparing generation for project:", id);
  const aiModel = getSelectedAiModel();
  const apiToken = await getAiApiToken(aiModel, token);
  const html = loadHtml(id);
  const assets = loadAssets(id);
  log("  Model:", aiModel, "| HTML chars:", html?.length ?? 0, "| has assets:", !!assets);
  if (!html && !assets) throw new Error("No captured content available to analyze.");
  return { aiModel, apiToken, userMessage: buildGenerationUserMessage(html, assets) };
}

let activeAbort: AbortController | null = null;

export function cancelActiveGeneration() {
  if (activeAbort) { log("Cancelling active generation"); activeAbort.abort(); activeAbort = null; }
}

async function streamWithProgress(id: string, getWin: GetMainWindow, args: { aiModel: string; apiToken: string; userMessage: string }) {
  emitProgress(getWin, { projectId: id, stage: "prompting", message: `Asking ${args.aiModel} to draft your design spec…` });
  log("Sending request to LLM (user message chars:", args.userMessage.length, ")");
  cancelActiveGeneration();
  activeAbort = new AbortController();
  let lastLogged = 0;
  const raw = await streamDesignCompletion({
    ...args,
    signal: activeAbort.signal,
    onChunk: (accumulated) => {
      emitProgress(getWin, { projectId: id, stage: "streaming", content: accumulated });
      if (accumulated.length - lastLogged >= 1000) {
        log("  Streaming… received", accumulated.length, "chars");
        lastLogged = accumulated.length;
      }
    },
  });
  activeAbort = null;
  log("Stream complete. Total chars:", raw.length);
  return raw;
}

export async function runGeneration(id: string, getWin: GetMainWindow): Promise<string> {
  const prep = await prepareGeneration(id, getWin);
  const raw = await streamWithProgress(id, getWin, prep);
  const content = stripCodeFences(raw);
  if (!content) throw new Error("Generation produced no content.");
  emitProgress(getWin, { projectId: id, stage: "saving", message: "Saving design.md…", content });
  writeProjectDesign(id, content);
  log("Saved design.md for project:", id, "(", content.length, "chars )");
  emitProgress(getWin, { projectId: id, stage: "complete", content });
  return content;
}
