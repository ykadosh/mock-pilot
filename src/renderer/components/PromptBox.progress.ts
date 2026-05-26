import { useEffect, useRef, useState } from "react";

const TOOL_LABELS: Record<string, string> = {
  searchHtml: "Searching HTML structure",
  searchCss: "Searching stylesheets",
  getElementInfo: "Inspecting element",
  editHtml: "Editing HTML",
  editCss: "Editing CSS",
  addElement: "Adding element",
  removeElement: "Removing element",
  takeScreenshot: "Taking screenshot",
  listFonts: "Checking fonts",
  listComponents: "Listing components",
  listIcons: "Listing icons",
  getDesignTokens: "Reading design tokens",
};

function getToolLabel(toolName?: string): string {
  if (!toolName) return "Processing";
  return TOOL_LABELS[toolName] || toolName;
}

interface ProgressState {
  setAgentProgress: React.Dispatch<React.SetStateAction<{ toolName?: string; iteration?: number; maxIterations?: number } | null>>;
  setAgentProcessing: (v: boolean) => void;
  lastIterationRef: React.RefObject<number>;
  onConversationMessage?: (role: "user" | "assistant", content: string, type?: "message" | "thinking" | "tool" | "done") => void;
}

function handleProgressEvent(progress: { type: string; toolName?: string; iteration?: number; maxIterations?: number; content?: string }, state: ProgressState) {
  const { setAgentProgress, setAgentProcessing, lastIterationRef } = state;
  if (progress.type === "thinking" && progress.content) {
    state.onConversationMessage?.("assistant", progress.content, "thinking");
  } else if (progress.type === "tool_start") {
    // Skip showing the "finish" tool in the conversation
    if (progress.toolName === "finish") return;
    setAgentProgress((prev) => ({ ...prev, toolName: progress.toolName }));
    setAgentProcessing(true);
    state.onConversationMessage?.("assistant", getToolLabel(progress.toolName), "tool");
  } else if (progress.type === "tool_end") {
    setAgentProcessing(true);
  } else if (progress.type === "iteration") {
    setAgentProgress({ iteration: progress.iteration, maxIterations: progress.maxIterations });
    setAgentProcessing(true);
    if (progress.iteration) lastIterationRef.current = progress.iteration;
  } else {
    setAgentProgress(null);
    setAgentProcessing(false);
    lastIterationRef.current = 0;
  }
}

export function useAgentProgressListener(onConversationMessage?: (role: "user" | "assistant", content: string, type?: "message" | "thinking" | "tool" | "done") => void) {
  const [agentProgress, setAgentProgress] = useState<{ toolName?: string; iteration?: number; maxIterations?: number } | null>(null);
  const [agentProcessing, setAgentProcessing] = useState(false);
  const lastIterationRef = useRef(0);

  useEffect(() => {
    const state: ProgressState = { setAgentProgress, setAgentProcessing, lastIterationRef, onConversationMessage };
    const cleanup = window.api.onAiAgentProgress((progress) => handleProgressEvent(progress, state));
    return cleanup;
  }, [onConversationMessage]);

  return { agentProcessing, agentProgress, clearProgress: () => { setAgentProgress(null); setAgentProcessing(false); lastIterationRef.current = 0; } };
}
