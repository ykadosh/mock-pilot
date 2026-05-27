import { ipcMain } from "electron";

import {
  DEFAULT_CONVERSATION_TITLE,
  newSessionId,
  readIndex,
  readSession,
  removeSession,
  upsertIndexEntry,
  writeSession,
  type ConversationAgentMessage,
  type ConversationDisplayMessage,
  type ConversationSession,
  type ConversationSessionMeta,
} from "./conversation-storage";

interface SaveConversationArgs {
  projectId: string;
  sessionId: string;
  displayMessages?: ConversationDisplayMessage[];
  agentMessages?: ConversationAgentMessage[];
  title?: string;
}

function pickTitle(args: SaveConversationArgs, existing: ConversationSession | null): string {
  if (args.title !== undefined) return args.title;
  if (existing) return existing.title;
  return DEFAULT_CONVERSATION_TITLE;
}

function buildSessionForSave(args: SaveConversationArgs, existing: ConversationSession | null): ConversationSession {
  const now = Date.now();
  return {
    id: args.sessionId,
    title: pickTitle(args, existing),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    displayMessages: args.displayMessages ?? existing?.displayMessages ?? [],
    agentMessages: args.agentMessages ?? existing?.agentMessages ?? [],
  };
}

function handleListConversations(_event: Electron.IpcMainInvokeEvent, projectId: string) {
  try {
    return { success: true, sessions: readIndex(projectId) };
  } catch {
    return { success: false, sessions: [] as ConversationSessionMeta[] };
  }
}

function handleLoadConversation(_event: Electron.IpcMainInvokeEvent, projectId: string, sessionId: string) {
  try {
    const session = readSession(projectId, sessionId);
    if (!session) return { success: false };
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

function handleSaveConversation(_event: Electron.IpcMainInvokeEvent, args: SaveConversationArgs) {
  try {
    const existing = readSession(args.projectId, args.sessionId);
    const session = buildSessionForSave(args, existing);
    writeSession(args.projectId, session);
    upsertIndexEntry(args.projectId, { id: session.id, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt });
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

function handleCreateConversation(_event: Electron.IpcMainInvokeEvent, projectId: string, title?: string) {
  try {
    const id = newSessionId();
    const now = Date.now();
    const session: ConversationSession = {
      id,
      title: title || DEFAULT_CONVERSATION_TITLE,
      createdAt: now,
      updatedAt: now,
      displayMessages: [],
      agentMessages: [],
    };
    writeSession(projectId, session);
    upsertIndexEntry(projectId, { id, title: session.title, createdAt: now, updatedAt: now });
    return { success: true, session };
  } catch {
    return { success: false };
  }
}

function handleDeleteConversation(_event: Electron.IpcMainInvokeEvent, projectId: string, sessionId: string) {
  try {
    removeSession(projectId, sessionId);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export function registerConversationHandlers() {
  ipcMain.handle("list-project-conversations", handleListConversations);
  ipcMain.handle("load-project-conversation", handleLoadConversation);
  ipcMain.handle("save-project-conversation", handleSaveConversation);
  ipcMain.handle("create-project-conversation", handleCreateConversation);
  ipcMain.handle("delete-project-conversation", handleDeleteConversation);
}
