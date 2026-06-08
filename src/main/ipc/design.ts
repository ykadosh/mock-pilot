import { ipcMain } from "electron";

import {
  readProjectDesignRaw,
  writeProjectDesign,
  deleteProjectDesign,
  isProjectDesignEnabled,
  setProjectDesignEnabled,
} from "../project-design";
import {
  cancelActiveGeneration,
  emitProgress,
  runGeneration,
  type GetMainWindow,
} from "./design-generate";

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[Design]", ...args);
}

async function handleGetProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const content = readProjectDesignRaw(id);
    const enabled = isProjectDesignEnabled(id);
    return { success: true, content: content ?? "", enabled };
  } catch (error) { return { success: false, error: String(error) }; }
}

async function handleSaveProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string, content: string) {
  try {
    if (typeof content !== "string") return { success: false, error: "Invalid content" };
    if (content.trim().length === 0) deleteProjectDesign(id);
    else writeProjectDesign(id, content);
    log("Saved design.md for project:", id, "(", content.length, "chars )");
    return { success: true };
  } catch (error) { return { success: false, error: String(error) }; }
}

async function handleDeleteProjectDesign(_event: Electron.IpcMainInvokeEvent, id: string) {
  try { deleteProjectDesign(id); log("Deleted design.md for project:", id); return { success: true }; }
  catch (error) { return { success: false, error: String(error) }; }
}

async function handleSetProjectDesignEnabled(_event: Electron.IpcMainInvokeEvent, id: string, enabled: boolean) {
  try {
    setProjectDesignEnabled(id, enabled);
    log("Set design enabled =", enabled, "for project:", id);
    return { success: true };
  } catch (error) { return { success: false, error: String(error) }; }
}

function makeGenerateHandler(getWin: GetMainWindow) {
  return async (_event: Electron.IpcMainInvokeEvent, id: string) => {
    try {
      const content = await runGeneration(id, getWin);
      return { success: true, content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("Generation failed for project:", id, "-", message);
      emitProgress(getWin, { projectId: id, stage: "error", error: message });
      return { success: false, error: message };
    }
  };
}

function handleCancelGeneration() {
  cancelActiveGeneration();
  return { success: true };
}

export function registerDesignHandlers(getWin: GetMainWindow) {
  ipcMain.handle("get-project-design", handleGetProjectDesign);
  ipcMain.handle("save-project-design", handleSaveProjectDesign);
  ipcMain.handle("delete-project-design", handleDeleteProjectDesign);
  ipcMain.handle("set-project-design-enabled", handleSetProjectDesignEnabled);
  ipcMain.handle("generate-project-design", makeGenerateHandler(getWin));
  ipcMain.handle("cancel-design-generation", handleCancelGeneration);
}
