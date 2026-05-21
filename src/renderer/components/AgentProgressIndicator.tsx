const TOOL_LABELS: Record<string, string> = {
  searchHtml: "Searching HTML...",
  searchCss: "Searching CSS...",
  getElementInfo: "Inspecting element...",
  editHtml: "Editing HTML...",
  editCss: "Editing CSS...",
  addElement: "Adding element...",
  removeElement: "Removing element...",
  takeScreenshot: "Taking screenshot...",
  listFonts: "Listing fonts...",
  listComponents: "Listing components...",
  listIcons: "Listing icons...",
  getDesignTokens: "Reading design tokens...",
};

interface AgentProgressProps {
  progress?: { toolName?: string; iteration?: number; maxIterations?: number } | null;
}

export function AgentProgressIndicator({ progress }: AgentProgressProps) {
  if (!progress) return null;
  const toolLabel = progress.toolName ? (TOOL_LABELS[progress.toolName] || `Running ${progress.toolName}...`) : "Thinking...";
  const iterLabel = progress.iteration && progress.maxIterations ? `Step ${progress.iteration}/${progress.maxIterations}` : "";

  return (
    <div className="flex items-center gap-2 px-3 pb-2 text-[11px] text-slate-400">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
      <span>{toolLabel}</span>
      {iterLabel && <span className="text-slate-500">({iterLabel})</span>}
    </div>
  );
}
