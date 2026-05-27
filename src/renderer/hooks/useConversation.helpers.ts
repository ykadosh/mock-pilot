import type { ActiveSessionState, AgentMessage, ConversationMessage, SessionMeta } from "./useConversation.types";
import { DEFAULT_CONVERSATION_TITLE, deriveSessionTitle } from "./useConversation.types";

export interface PersistArgs {
  projectId?: string;
  setSessions: React.Dispatch<React.SetStateAction<SessionMeta[]>>;
}

export interface PersistUpdates {
  displayMessages?: ConversationMessage[];
  agentMessages?: AgentMessage[];
  title?: string;
}

export function persistSession(args: PersistArgs, sessionId: string, updates: PersistUpdates) {
  if (!args.projectId) return;
  window.api.saveProjectConversation(args.projectId, sessionId, updates).then((res) => {
    if (!res.success || !res.session) return;
    args.setSessions((prev) => {
      const copy = prev.slice();
      const idx = copy.findIndex((s) => s.id === res.session!.id);
      const meta: SessionMeta = { id: res.session!.id, title: res.session!.title, createdAt: res.session!.createdAt, updatedAt: res.session!.updatedAt };
      if (idx >= 0) copy[idx] = meta; else copy.push(meta);
      return copy;
    });
  });
}

export interface AppendMessageArgs {
  prev: ActiveSessionState;
  role: "user" | "assistant";
  content: string;
  type?: ConversationMessage["type"];
}

export function appendMessage(args: AppendMessageArgs): { next: ActiveSessionState; titleChanged: boolean } {
  const { prev, role, content, type } = args;
  const msg: ConversationMessage = { role, content, timestamp: Date.now(), type };
  const displayMessages = [...prev.displayMessages, msg];
  const isDefaultTitle = prev.meta.title === DEFAULT_CONVERSATION_TITLE;
  const shouldRetitle = isDefaultTitle && role === "user" && type === "message";
  const nextTitle = shouldRetitle ? deriveSessionTitle(content) : prev.meta.title;
  const next: ActiveSessionState = {
    meta: { ...prev.meta, title: nextTitle, updatedAt: Date.now() },
    displayMessages,
    agentMessages: prev.agentMessages,
  };
  return { next, titleChanged: shouldRetitle };
}

export interface BootstrapArgs {
  projectId: string;
  setSessions: React.Dispatch<React.SetStateAction<SessionMeta[]>>;
  adoptSession: (session: ActiveSessionState["meta"] & { displayMessages: ConversationMessage[]; agentMessages: AgentMessage[] }) => void;
  setReady: (v: boolean) => void;
}

export async function bootstrapSessions(args: BootstrapArgs) {
  const listRes = await window.api.listProjectConversations(args.projectId);
  const list = listRes.success ? listRes.sessions : [];
  if (list.length === 0) {
    const createRes = await window.api.createProjectConversation(args.projectId);
    if (createRes.success && createRes.session) {
      args.setSessions([{ id: createRes.session.id, title: createRes.session.title, createdAt: createRes.session.createdAt, updatedAt: createRes.session.updatedAt }]);
      args.adoptSession(createRes.session);
    }
  } else {
    args.setSessions(list);
    const latest = list.slice().sort((a, b) => b.createdAt - a.createdAt)[0];
    const loaded = await window.api.loadProjectConversation(args.projectId, latest.id);
    if (loaded.success && loaded.session) args.adoptSession(loaded.session);
  }
  args.setReady(true);
}

export function computeIsLatest(active: ActiveSessionState | null, sessions: SessionMeta[]): boolean {
  if (!active || sessions.length === 0) return true;
  const latestId = sessions.slice().sort((a, b) => b.createdAt - a.createdAt)[0]?.id;
  return latestId === active.meta.id;
}
