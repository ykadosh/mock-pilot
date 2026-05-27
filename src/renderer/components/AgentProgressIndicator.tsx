const TOOL_LABELS: Record<string, string> = {
  planChanges: "Planning changes...",
  reinspect: "Re-inspecting...",
  verifyPlanItem: "Verifying plan item...",
  searchHtml: "Searching HTML...",
  searchCss: "Searching CSS...",
  getElementInfo: "Inspecting element...",
  batchSearchHtml: "Searching HTML (batch)...",
  batchSearchCss: "Searching CSS (batch)...",
  batchGetElementInfo: "Inspecting elements (batch)...",
  editHtml: "Editing HTML...",
  editCss: "Editing CSS...",
  editText: "Editing text...",
  editAttribute: "Editing attribute...",
  editInnerHtml: "Editing inner HTML...",
  addElement: "Adding element...",
  removeElement: "Removing element...",
  undo: "Undoing change...",
  takeScreenshot: "Taking screenshot...",
  listFonts: "Listing fonts...",
  listComponents: "Listing components...",
  listIcons: "Listing icons...",
  getDesignTokens: "Reading design tokens...",
  finish: "Finishing...",
};

const PHASE_LABELS: Record<string, string> = {
  PLAN: "Planning",
  INSPECT: "Inspecting",
  MODIFY: "Editing",
  VERIFY: "Verifying",
};

interface AgentProgressProps {
  progress?: { toolName?: string; iteration?: number; maxIterations?: number; phase?: string; planTotal?: number; verifiedCount?: number } | null;
}

function buildMeta(progress: NonNullable<AgentProgressProps["progress"]>): string {
  const phaseLabel = progress.phase ? PHASE_LABELS[progress.phase] || progress.phase : "";
  if (progress.phase === "VERIFY" && progress.planTotal && progress.planTotal > 0) {
    const current = Math.min((progress.verifiedCount ?? 0) + 1, progress.planTotal);
    return `Verifying task ${current} of ${progress.planTotal}`;
  }
  return phaseLabel;
}

export function AgentProgressIndicator({ progress }: AgentProgressProps) {
  if (!progress) return null;
  const toolLabel = progress.toolName ? (TOOL_LABELS[progress.toolName] || `Running ${progress.toolName}...`) : "Thinking...";
  const meta = buildMeta(progress);

  return (
    <div className="flex items-center gap-2 px-3 pb-2 text-[11px] text-slate-400">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
      <span>{toolLabel}</span>
      {meta && <span className="text-slate-500">({meta})</span>}
    </div>
  );
}
