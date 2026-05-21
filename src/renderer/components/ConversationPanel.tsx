import { useEffect, useRef } from "react";
import type { ConversationMessage } from "../hooks/useConversation";
import { SidePanel } from "./ui/SidePanel";

interface ConversationPanelProps {
  messages: ConversationMessage[];
  agentProcessing?: boolean;
  awaitingContinue?: boolean;
  currentTool?: string;
  onClose: () => void;
  onContinue?: () => void;
}

function TypingIndicator({ toolName }: { toolName?: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-slate-700/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
          </div>
          {toolName && <span className="text-[10px] text-slate-500">{toolName}</span>}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${isUser ? "bg-violet-600/30 text-violet-200" : "bg-slate-700/50 text-slate-300"}`}>
        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
        <span className="mt-1 block text-[10px] text-slate-500">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export function ConversationPanel({ messages, agentProcessing, awaitingContinue, currentTool, onClose, onContinue }: ConversationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, agentProcessing, currentTool, awaitingContinue]);

  return (
    <SidePanel title="CONVERSATION" onClose={onClose}>
      <div ref={scrollRef} className="flex flex-col gap-2 p-3">
        {messages.length === 0 && !agentProcessing ? (
          <p className="mt-4 text-center text-xs text-slate-500">No conversation yet</p>
        ) : (
          <>
            {messages.map((msg, idx) => <MessageBubble key={idx} msg={msg} />)}
            {awaitingContinue && (
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
    </SidePanel>
  );
}
