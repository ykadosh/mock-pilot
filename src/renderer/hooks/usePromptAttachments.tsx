import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Attachment } from "../components/PromptBox.types";
import { getAssetAttachmentKey } from "../components/PromptBox.types";

interface ContextValue {
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  scopedProjectId: string | undefined;
  setScopedProjectId: (id: string | undefined) => void;
}

const Ctx = createContext<ContextValue | null>(null);

export function PromptAttachmentsProvider({ children }: { children: ReactNode }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [scopedProjectId, setScopedProjectId] = useState<string | undefined>(undefined);
  return (
    <Ctx.Provider value={{ attachments, setAttachments, scopedProjectId, setScopedProjectId }}>
      {children}
    </Ctx.Provider>
  );
}

function usePromptAttachmentsContext(): ContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePromptAttachments must be used within PromptAttachmentsProvider");
  return ctx;
}

/**
 * Subscribe to the prompt attachments for the given project. When the projectId
 * changes (e.g., user navigates to a different project), attachments are reset.
 */
export function usePromptAttachments(projectId: string | undefined) {
  const { attachments, setAttachments, scopedProjectId, setScopedProjectId } = usePromptAttachmentsContext();

  useEffect(() => {
    if (projectId === undefined) return;
    if (scopedProjectId !== projectId) {
      setAttachments([]);
      setScopedProjectId(projectId);
    }
  }, [projectId, scopedProjectId, setScopedProjectId, setAttachments]);

  const isAttached = useCallback((attachment: Attachment) => {
    const key = getAssetAttachmentKey(attachment);
    return attachments.some((existing) => getAssetAttachmentKey(existing) === key);
  }, [attachments]);

  const toggleAttachment = useCallback((attachment: Attachment) => {
    const key = getAssetAttachmentKey(attachment);
    setAttachments((prev) => {
      const exists = prev.some((existing) => getAssetAttachmentKey(existing) === key);
      if (exists) return prev.filter((existing) => getAssetAttachmentKey(existing) !== key);
      return [...prev, attachment];
    });
  }, [setAttachments]);

  return { attachments, setAttachments, isAttached, toggleAttachment };
}
