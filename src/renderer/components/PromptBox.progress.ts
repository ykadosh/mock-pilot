import { useEffect, useRef, useState } from "react";

const TOOL_LABELS: Record<string, string> = {
  planChanges: "Planning changes",
  reinspect: "Re-inspecting",
  searchHtml: "Searching HTML structure",
  searchCss: "Searching stylesheets",
  getElementInfo: "Inspecting element",
  batchSearchHtml: "Searching HTML structure (batch)",
  batchSearchCss: "Searching stylesheets (batch)",
  batchGetElementInfo: "Inspecting elements (batch)",
  editHtml: "Editing HTML",
  editCss: "Editing CSS",
  editText: "Editing text",
  editAttribute: "Editing attribute",
  editInnerHtml: "Editing inner HTML",
  addElement: "Adding element",
  removeElement: "Removing element",
  undo: "Undoing change",
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

type ProgressSnapshot = { toolName?: string; iteration?: number; maxIterations?: number; phase?: string; planTotal?: number; verifiedCount?: number } | null;

interface ProgressState {
  setAgentProgress: React.Dispatch<React.SetStateAction<ProgressSnapshot>>;
  setAgentProcessing: (v: boolean) => void;
  lastIterationRef: React.RefObject<number>;
  onConversationMessage?: (role: "user" | "assistant", content: string, opts?: { type?: "message" | "thinking" | "tool" | "done" }) => void;
}

type ProgressEvent = { type: string; toolName?: string; iteration?: number; maxIterations?: number; content?: string; phase?: string; planTotal?: number; verifiedCount?: number };

function handleToolStart(progress: ProgressEvent, state: ProgressState) {
  if (progress.toolName === "finish") return;
  state.setAgentProgress((prev) => ({ ...prev, toolName: progress.toolName }));
  state.setAgentProcessing(true);
  state.onConversationMessage?.("assistant", getToolLabel(progress.toolName), { type: "tool" });
}

function handleIteration(progress: ProgressEvent, state: ProgressState) {
  state.setAgentProgress((prev) => ({
    ...prev,
    iteration: progress.iteration,
    maxIterations: progress.maxIterations,
    phase: progress.phase ?? prev?.phase,
    planTotal: progress.planTotal ?? prev?.planTotal,
    verifiedCount: progress.verifiedCount ?? prev?.verifiedCount,
  }));
  state.setAgentProcessing(true);
  if (progress.iteration) state.lastIterationRef.current = progress.iteration;
}

function handleDone(state: ProgressState) {
  state.setAgentProgress(null);
  state.setAgentProcessing(false);
  state.lastIterationRef.current = 0;
}

function handleProgressEvent(progress: ProgressEvent, state: ProgressState) {
  switch (progress.type) {
    case "thinking":
      if (progress.content) state.onConversationMessage?.("assistant", progress.content, { type: "thinking" });
      return;
    case "tool_start": return handleToolStart(progress, state);
    case "tool_end": return state.setAgentProcessing(true);
    case "iteration": return handleIteration(progress, state);
    case "phase": return state.setAgentProgress((prev) => ({
      ...prev,
      phase: progress.phase,
      planTotal: progress.planTotal ?? prev?.planTotal,
      verifiedCount: progress.verifiedCount ?? prev?.verifiedCount,
    }));
    default: return handleDone(state);
  }
}

export function useAgentProgressListener(onConversationMessage?: (role: "user" | "assistant", content: string, opts?: { type?: "message" | "thinking" | "tool" | "done" }) => void) {
  const [agentProgress, setAgentProgress] = useState<ProgressSnapshot>(null);
  const [agentProcessing, setAgentProcessing] = useState(false);
  const lastIterationRef = useRef(0);

  useEffect(() => {
    const state: ProgressState = { setAgentProgress, setAgentProcessing, lastIterationRef, onConversationMessage };
    const cleanup = window.api.onAiAgentProgress((progress) => handleProgressEvent(progress, state));
    return cleanup;
  }, [onConversationMessage]);

  return { agentProcessing, agentProgress, clearProgress: () => { setAgentProgress(null); setAgentProcessing(false); lastIterationRef.current = 0; } };
}
