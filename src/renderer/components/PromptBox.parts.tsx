export function ReadOnlyPromptBox({ onStartNewConversation }: { onStartNewConversation?: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-70 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-2xl rounded-xl border border-slate-700/50 bg-[rgba(15,23,42,0.5)] p-3 shadow-2xl backdrop-blur-lg">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "20px" }}>lock</span>
          <div className="flex-1 text-[12px] leading-snug">
            This conversation is read-only. Start a new conversation to make changes.
          </div>
          {onStartNewConversation && (
            <button
              onClick={onStartNewConversation}
              className="cursor-pointer rounded-lg bg-violet-600/80 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-violet-500"
            >
              New conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DragOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl">
      <div className="flex items-center gap-2 rounded-lg bg-violet-600/90 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg">
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>image</span>
        Drop image to attach
      </div>
    </div>
  );
}

export function getContainerClass(loading: boolean, isDraggingOver: boolean): string {
  const base = "pointer-events-auto relative w-full max-w-2xl rounded-xl shadow-2xl";
  if (loading) return `${base} transition-colors prompt-box-loading`;
  const baseBg = "border border-slate-700/50 bg-[rgba(15,23,42,0.5)] backdrop-blur-lg";
  if (isDraggingOver) return `${base} ${baseBg} outline-2 outline-dashed outline-offset-2 outline-violet-800`;
  return `${base} ${baseBg} transition-colors focus-within:border-slate-500/40`;
}
