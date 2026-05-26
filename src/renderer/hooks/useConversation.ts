import { useCallback, useEffect, useRef, useState } from "react";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "message" | "thinking" | "tool";
}

export function useConversation(projectId?: string) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!projectId || loadedRef.current) return;
    loadedRef.current = true;
    window.api.loadProjectConversation(projectId).then((result) => {
      if (result.success && result.messages) setMessages(result.messages);
    });
  }, [projectId]);

  const save = useCallback((msgs: ConversationMessage[]) => {
    if (!projectId) return;
    window.api.saveProjectConversation(projectId, msgs);
  }, [projectId]);

  const addMessage = useCallback((role: "user" | "assistant", content: string, type?: "message" | "thinking" | "tool") => {
    const msg: ConversationMessage = { role, content, timestamp: Date.now(), type };
    setMessages((prev) => {
      const next = [...prev, msg];
      save(next);
      return next;
    });
  }, [save]);

  return { messages, addMessage };
}
