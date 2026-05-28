import { useEffect, useRef } from "react";
import type { ConversationMessage, SessionMeta } from "../hooks/useConversation";
import { MessageBubble, TypingIndicator } from "./ConversationPanel.bubbles";

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface DetailViewProps {
  messages: ConversationMessage[];
  agentProcessing?: boolean;
  awaitingContinue?: boolean;
  currentTool?: string;
  isReadOnly?: boolean;
  onContinue?: () => void;
}

function ReadOnlyBanner() {
  return (
    <div className="mb-1 flex items-center gap-2 rounded-lg border border-slate-700/60 bg-[#151e31] p-2 text-[11px] text-slate-400">
      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "14px" }}>lock</span>
      <span>Read-only — only the latest conversation can be continued.</span>
    </div>
  );
}

export function DetailView({ messages, agentProcessing, awaitingContinue, currentTool, isReadOnly, onContinue }: DetailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, agentProcessing, currentTool, awaitingContinue]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="flex flex-col gap-2 p-3">
        {isReadOnly && <ReadOnlyBanner />}
        {messages.length === 0 && !agentProcessing ? (
          <p className="mt-4 text-center text-xs text-slate-500">No messages yet</p>
        ) : (
          <>
            {messages.map((msg, idx) => <MessageBubble key={idx} msg={msg} />)}
            {awaitingContinue && !isReadOnly && (
              <div className="flex justify-start">
                <button onClick={onContinue} className="cursor-pointer rounded-lg bg-violet-600/30 px-4 py-2 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-600/50">
                  Continue →
                </button>
              </div>
            )}
            {agentProcessing && <TypingIndicator toolName={currentTool} />}
          </>
        )}
      </div>
    </div>
  );
}

interface ListViewProps {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
}

function SessionRow({ session, isActive, isLatest, onSelect }: { session: SessionMeta; isActive: boolean; isLatest: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-2 border-b border-slate-800/80 px-3 py-2.5 text-left transition-colors hover:bg-slate-800/60 ${isActive ? "bg-slate-800/40" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          {!isLatest && (
            <span className="material-symbols-outlined text-slate-500" style={{ fontSize: "12px" }}>lock</span>
          )}
          <span className="truncate text-[13px] text-slate-200">{session.title}</span>
        </div>
        <span className="text-[10px] text-slate-500">{formatRelativeTime(session.updatedAt)}</span>
      </div>
      <span className="material-symbols-outlined text-slate-500" style={{ fontSize: "16px" }}>chevron_right</span>
    </button>
  );
}

export function ListView({ sessions, activeSessionId, onSelectSession }: ListViewProps) {
  const ordered = sessions.slice().sort((a, b) => b.createdAt - a.createdAt);
  const latestId = ordered[0]?.id;

  if (ordered.length === 0) {
    return <p className="mt-6 text-center text-xs text-slate-500">No conversations yet</p>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col">
        {ordered.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            isActive={s.id === activeSessionId}
            isLatest={s.id === latestId}
            onSelect={() => onSelectSession(s.id)}
          />
        ))}
      </div>
    </div>
  );
}
