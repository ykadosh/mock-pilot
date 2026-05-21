import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import type { Attachment } from "./PromptBox.types";
import { applyElementModification, applyAgentModification, isSimplePrompt } from "./PromptBox.utils";

interface UsePromptSubmitArgs {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  onApplyPageModification?: (newHTML: string, label?: string) => void;
  getElementHTML?: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
  getFullPageHTML?: () => string | null;
  projectAssets?: object;
}

function useAgentProgressListener() {
  const [agentProgress, setAgentProgress] = useState<{ toolName?: string; iteration?: number; maxIterations?: number } | null>(null);

  useEffect(() => {
    const cleanup = window.api.onAiAgentProgress((progress) => {
      if (progress.type === "tool_start") setAgentProgress((prev) => ({ ...prev, toolName: progress.toolName }));
      else if (progress.type === "iteration") setAgentProgress({ iteration: progress.iteration, maxIterations: progress.maxIterations });
      else if (progress.type === "complete" || progress.type === "error") setAgentProgress(null);
    });
    return cleanup;
  }, []);

  return { agentProgress, clearProgress: () => setAgentProgress(null) };
}

async function executeModification(args: UsePromptSubmitArgs, trimmedPrompt: string): Promise<string | null> {
  if (isSimplePrompt(trimmedPrompt, args.attachments)) {
    console.log("[PromptBox] Using single-shot element modification"); // eslint-disable-line no-console
    return applyElementModification({ attachments: args.attachments, prompt: trimmedPrompt, getElementHTML: args.getElementHTML, onApply: args.onApplyModification });
  }
  console.log("[PromptBox] Using agent loop modification"); // eslint-disable-line no-console
  return applyAgentModification({ prompt: trimmedPrompt, attachments: args.attachments, getFullPageHTML: args.getFullPageHTML, onApply: args.onApplyPageModification, projectAssets: args.projectAssets });
}

function isCancelError(e: unknown): boolean {
  return e instanceof Error && (e.message.includes("abort") || e.message.includes("Cancel"));
}

export function usePromptSubmit(args: UsePromptSubmitArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const { agentProgress, clearProgress } = useAgentProgressListener();

  const handleCancel = useCallback(async () => {
    await window.api.aiAgentCancel();
    await window.api.aiCancelRequest();
    setLoading(false);
    setError("");
    clearProgress();
  }, [clearProgress]);

  const handleApply = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    setLoading(true);
    setError("");
    clearProgress();
    try {
      const errorMsg = await executeModification(args, trimmedPrompt);
      if (errorMsg) { if (!errorMsg.includes("abort") && !errorMsg.includes("Cancel")) setError(errorMsg); return; }
      setPrompt("");
      args.setAttachments([]);
    } catch (e: unknown) {
      if (!isCancelError(e)) setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
      clearProgress();
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && event.shiftKey) { event.stopPropagation(); return; }
    if (event.key !== "Enter" || !prompt.trim() || loading) return;
    event.preventDefault();
    void handleApply();
  };

  return { agentProgress, error, handleApply, handleCancel, handlePromptKeyDown, loading, prompt, setPrompt };
}
