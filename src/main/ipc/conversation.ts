import { ipcMain } from "electron";
import fs from "fs";
import path from "path";

import { ensureProjectDir, getProjectDir } from "../projects";

type ConversationMessage = { role: string; content: string; timestamp: number };

function conversationFilePath(id: string) {
  return path.join(getProjectDir(id), "conversation.json");
}

function handleSaveProjectConversation(_event: Electron.IpcMainInvokeEvent, id: string, messages: ConversationMessage[]) {
  try {
    ensureProjectDir(id);
    fs.writeFileSync(conversationFilePath(id), JSON.stringify(messages), "utf-8");
    return { success: true };
  } catch {
    return { success: false };
  }
}

function handleLoadProjectConversation(_event: Electron.IpcMainInvokeEvent, id: string) {
  try {
    const filePath = conversationFilePath(id);
    if (!fs.existsSync(filePath)) return { success: true, messages: [] };
    const messages = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ConversationMessage[];
    return { success: true, messages };
  } catch {
    return { success: false };
  }
}

export function registerConversationHandlers() {
  ipcMain.handle("save-project-conversation", handleSaveProjectConversation);
  ipcMain.handle("load-project-conversation", handleLoadProjectConversation);
}
