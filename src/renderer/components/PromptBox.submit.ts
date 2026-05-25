import { useCallback, useState, type KeyboardEvent } from "react";
import type { Attachment } from "./PromptBox.types";
import { useAgentProgressListener } from "./PromptBox.progress";
import { applyAgentModification } from "./PromptBox.utils";

interface UsePromptSubmitArgs {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  onApplyPageModification?: (newHTML: string, label?: string) => void;
  getElementHTML?: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
  getFullPageHTML?: () => string | null;
  projectAssets?: object;
  onConversationMessage?: (role: "user" | "assistant", content: string) => void;
  openChat?: () => void;
}

interface ModificationResult {
  error?: string;
  summary?: string;
  maxIterationsReached?: boolean;
}

async function executeModification(args: UsePromptSubmitArgs, trimmedPrompt: string, continueFromPrevious?: boolean): Promise<ModificationResult> {
  return applyAgentModification({ prompt: trimmedPrompt, attachments: args.attachments, getFullPageHTML: args.getFullPageHTML, onApply: args.onApplyPageModification, projectAssets: args.projectAssets, continueFromPrevious });
}

function isCancelError(e: unknown): boolean {
  return e instanceof Error && (e.message.includes("abort") || e.message.includes("Cancel"));
}

interface SubmitState {
  setLoading: (v: boolean) => void;
  setError: (v: string) => void;
  setPrompt: (v: string) => void;
  clearProgress: () => void;
  setAwaitingContinue: (v: boolean) => void;
  continueFromPrevious?: boolean;
}

async function applyPrompt(args: UsePromptSubmitArgs, trimmedPrompt: string, state: SubmitState) {
  args.openChat?.();

  const result = await executeModification(args, trimmedPrompt, state.continueFromPrevious);
  if (result.error) {
    if (!isCancelError(new Error(result.error))) state.setError(result.error);
    return;
  }
  if (result.maxIterationsReached) {
    args.onConversationMessage?.("assistant", "⚠️ Reached the maximum number of iterations. The changes made so far have been applied. Would you like to continue?");
    state.setAwaitingContinue(true);
    state.setPrompt(trimmedPrompt);
    args.setAttachments([]);
    return;
  }
  const summary = result.summary || "Changes applied successfully";
  args.onConversationMessage?.("assistant", `✓ ${summary}`);
  state.setPrompt("");
  args.setAttachments([]);
}

async function runPromptFlow(args: UsePromptSubmitArgs, trimmedPrompt: string, state: SubmitState & { displayMessage?: string }) {
  state.setAwaitingContinue(false);
  state.setLoading(true);
  state.clearProgress();
  args.onConversationMessage?.("user", state.displayMessage || trimmedPrompt);
  try {
    await applyPrompt(args, trimmedPrompt, state);
  } catch (e: unknown) {
    if (!isCancelError(e)) state.setError(e instanceof Error ? e.message : "Unexpected error");
  } finally {
    state.setLoading(false);
    state.clearProgress();
  }
}

export function usePromptSubmit(args: UsePromptSubmitArgs) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const { agentProcessing, agentProgress, clearProgress } = useAgentProgressListener(args.onConversationMessage);
  const state = { setLoading, setError, setPrompt, clearProgress, setAwaitingContinue };

  const handleCancel = useCallback(async () => {
    await window.api.aiAgentCancel();
    await window.api.aiCancelRequest();
    setLoading(false); setError(""); setAwaitingContinue(false); clearProgress();
  }, [clearProgress]);

  const handleApply = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    setError("");
    await runPromptFlow(args, trimmedPrompt, state);
  };

  const handleContinue = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    await runPromptFlow(args, trimmedPrompt, { ...state, displayMessage: "Continue", continueFromPrevious: true });
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && event.shiftKey) { event.stopPropagation(); return; }
    if (event.key !== "Enter" || !prompt.trim() || loading) return;
    event.preventDefault();
    void handleApply();
  };

  return { agentProcessing, agentProgress, awaitingContinue, error, handleApply, handleCancel, handleContinue, handlePromptKeyDown, loading, prompt, setPrompt };
}
