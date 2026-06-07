import { useCallback, useEffect, useRef, useState } from "react";
import type { ActiveSessionState, AgentMessage, ConversationMessage, SessionMeta } from "./useConversation.types";
import type { Attachment } from "../components/PromptBox.types";
import { appendMessage, bootstrapSessions, computeIsLatest, persistSession } from "./useConversation.helpers";

export type { AgentMessage, ConversationMessage, SessionMeta } from "./useConversation.types";

export interface ConversationApi {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  activeSessionMeta: SessionMeta | null;
  displayMessages: ConversationMessage[];
  isActiveLatest: boolean;
  addMessage: (role: "user" | "assistant", content: string, opts?: { type?: ConversationMessage["type"]; attachments?: Attachment[] }) => void;
  setAgentMessages: (messages: AgentMessage[]) => void;
  getAgentMessages: () => AgentMessage[];
  newConversation: () => Promise<SessionMeta | null>;
  switchSession: (id: string) => Promise<void>;
  ready: boolean;
}

interface ActionHookArgs {
  projectId?: string;
  setSessions: React.Dispatch<React.SetStateAction<SessionMeta[]>>;
  setActive: React.Dispatch<React.SetStateAction<ActiveSessionState | null>>;
  activeRef: React.RefObject<ActiveSessionState | null>;
  adoptSession: (session: { id: string; title: string; createdAt: number; updatedAt: number; displayMessages: ConversationMessage[]; agentMessages: AgentMessage[] }) => void;
}

function useConversationActions({ projectId, setSessions, setActive, activeRef, adoptSession }: ActionHookArgs) {
  const addMessage = useCallback((role: "user" | "assistant", content: string, opts?: { type?: ConversationMessage["type"]; attachments?: Attachment[] }) => {
    setActive((prev) => {
      if (!prev) return prev;
      const { next, titleChanged } = appendMessage({ prev, role, content, type: opts?.type, attachments: opts?.attachments });
      persistSession({ projectId, setSessions }, next.meta.id, { displayMessages: next.displayMessages, title: titleChanged ? next.meta.title : undefined });
      return next;
    });
  }, [projectId, setSessions, setActive]);

  const setAgentMessages = useCallback((messages: AgentMessage[]) => {
    setActive((prev) => {
      if (!prev) return prev;
      const next: ActiveSessionState = { meta: { ...prev.meta, updatedAt: Date.now() }, displayMessages: prev.displayMessages, agentMessages: messages };
      persistSession({ projectId, setSessions }, next.meta.id, { agentMessages: messages });
      return next;
    });
  }, [projectId, setSessions, setActive]);

  const getAgentMessages = useCallback(() => activeRef.current?.agentMessages ?? [], [activeRef]);

  const newConversation = useCallback(async () => {
    if (!projectId) return null;
    const res = await window.api.createProjectConversation(projectId);
    if (!res.success || !res.session) return null;
    const meta: SessionMeta = { id: res.session.id, title: res.session.title, createdAt: res.session.createdAt, updatedAt: res.session.updatedAt };
    setSessions((prev) => [...prev, meta]);
    adoptSession(res.session);
    return meta;
  }, [projectId, adoptSession, setSessions]);

  const switchSession = useCallback(async (id: string) => {
    if (!projectId || activeRef.current?.meta.id === id) return;
    const loaded = await window.api.loadProjectConversation(projectId, id);
    if (loaded.success && loaded.session) adoptSession(loaded.session);
  }, [projectId, adoptSession, activeRef]);

  return { addMessage, setAgentMessages, getAgentMessages, newConversation, switchSession };
}

export function useConversation(projectId?: string): ConversationApi {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [active, setActive] = useState<ActiveSessionState | null>(null);
  const [ready, setReady] = useState(false);
  const loadedRef = useRef(false);
  const activeRef = useRef<ActiveSessionState | null>(null);
  activeRef.current = active;

  const adoptSession = useCallback((session: { id: string; title: string; createdAt: number; updatedAt: number; displayMessages: ConversationMessage[]; agentMessages: AgentMessage[] }) => {
    setActive({
      meta: { id: session.id, title: session.title, createdAt: session.createdAt, updatedAt: session.updatedAt },
      displayMessages: session.displayMessages || [],
      agentMessages: session.agentMessages || [],
    });
  }, []);

  useEffect(() => {
    if (!projectId || loadedRef.current) return;
    loadedRef.current = true;
    void bootstrapSessions({ projectId, setSessions, adoptSession, setReady });
  }, [projectId, adoptSession]);

  const actions = useConversationActions({ projectId, setSessions, setActive, activeRef, adoptSession });

  return {
    sessions,
    activeSessionId: active?.meta.id ?? null,
    activeSessionMeta: active?.meta ?? null,
    displayMessages: active?.displayMessages ?? [],
    isActiveLatest: computeIsLatest(active, sessions),
    ...actions,
    ready,
  };
}
