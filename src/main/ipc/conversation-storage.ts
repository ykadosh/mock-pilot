import crypto from "crypto";
import fs from "fs";
import path from "path";

import { ensureProjectDir, getProjectDir } from "../projects";

export interface ConversationDisplayMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "message" | "thinking" | "tool" | "done";
}

export interface ConversationAgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | object[];
  tool_calls?: unknown[];
  tool_call_id?: string;
}

export interface ConversationSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSession extends ConversationSessionMeta {
  displayMessages: ConversationDisplayMessage[];
  agentMessages: ConversationAgentMessage[];
}

export const DEFAULT_CONVERSATION_TITLE = "New conversation";

function conversationsDir(projectId: string) {
  return path.join(getProjectDir(projectId), "conversations");
}

function ensureConversationsDir(projectId: string) {
  ensureProjectDir(projectId);
  const dir = conversationsDir(projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function indexPath(projectId: string) {
  return path.join(conversationsDir(projectId), "index.json");
}

function sessionPath(projectId: string, sessionId: string) {
  return path.join(conversationsDir(projectId), `${sessionId}.json`);
}

export function readIndex(projectId: string): ConversationSessionMeta[] {
  const file = indexPath(projectId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as ConversationSessionMeta[];
  } catch {
    return [];
  }
}

function writeIndex(projectId: string, sessions: ConversationSessionMeta[]) {
  ensureConversationsDir(projectId);
  fs.writeFileSync(indexPath(projectId), JSON.stringify(sessions), "utf-8");
}

export function readSession(projectId: string, sessionId: string): ConversationSession | null {
  const file = sessionPath(projectId, sessionId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as ConversationSession;
  } catch {
    return null;
  }
}

export function writeSession(projectId: string, session: ConversationSession) {
  ensureConversationsDir(projectId);
  fs.writeFileSync(sessionPath(projectId, session.id), JSON.stringify(session), "utf-8");
}

export function upsertIndexEntry(projectId: string, meta: ConversationSessionMeta) {
  const sessions = readIndex(projectId);
  const idx = sessions.findIndex((s) => s.id === meta.id);
  if (idx >= 0) sessions[idx] = meta;
  else sessions.push(meta);
  writeIndex(projectId, sessions);
}

export function removeSession(projectId: string, sessionId: string) {
  const file = sessionPath(projectId, sessionId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  const remaining = readIndex(projectId).filter((s) => s.id !== sessionId);
  writeIndex(projectId, remaining);
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
