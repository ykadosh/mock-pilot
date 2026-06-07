import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ConversationMessage } from "../hooks/useConversation";
import type { Attachment } from "./PromptBox.types";
import { AttachmentChips } from "./PromptBox.chips";

export function TypingIndicator({ toolName }: { toolName?: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-lg bg-[#212c40] px-3 py-2">
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="ml-1 shrink-0 cursor-pointer text-violet-400/60 transition-colors hover:text-violet-300"
      title="Copy prompt"
    >
      <span className="material-symbols-outlined text-[12px]">{copied ? "check" : "content_copy"}</span>
    </button>
  );
}

function ToolPill({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-[#172033] px-2.5 py-1">
        <span className="material-symbols-outlined text-violet-400" style={{ fontSize: "14px" }}>construction</span>
        <span className="font-mono text-[11px] text-slate-400">{content}</span>
      </div>
    </div>
  );
}

function DoneBubble({ content }: { content: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-violet-500/20 bg-[#151a34] p-3">
      <div className="absolute top-0 left-0 h-full w-1 bg-violet-500"></div>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-violet-400" style={{ fontSize: "18px" }}>task_alt</span>
        <div className="prose prose-invert prose-sm prose-p:my-0 prose-p:whitespace-pre-wrap prose-pre:my-1 prose-pre:bg-slate-800 prose-pre:text-[11px] prose-code:text-violet-300 prose-code:before:content-none prose-code:after:content-none prose-ol:list-decimal prose-li:pl-0 prose-ul:pl-4 max-w-none flex-1 text-[13px] break-words text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content, attachments }: { content: string; attachments?: Attachment[] }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[85%] rounded-lg border border-violet-500/30 bg-[#172033] px-3 py-2">
        <div className="prose prose-invert prose-sm prose-p:my-0 prose-p:whitespace-pre-wrap prose-pre:my-1 prose-pre:bg-slate-800 prose-pre:text-[11px] prose-code:text-violet-300 prose-code:before:content-none prose-code:after:content-none prose-ol:list-decimal prose-li:pl-0 max-w-none text-[13px] break-words text-slate-200">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        <div className="mt-1 flex items-center justify-end">
          <CopyButton text={content} />
        </div>
      </div>
      {attachments && attachments.length > 0 && (
        <AttachmentChips attachments={attachments} className="flex max-w-[85%] flex-wrap justify-end gap-2" />
      )}
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-lg border border-slate-700 bg-[#141c2f] px-3 py-2">
        <div className="prose prose-invert prose-sm prose-p:my-0 prose-p:whitespace-pre-wrap prose-pre:my-1 prose-pre:bg-slate-800 prose-pre:text-[11px] prose-code:text-violet-300 prose-code:before:content-none prose-code:after:content-none prose-ol:list-decimal prose-li:pl-0 max-w-none text-[13px] break-words text-slate-300">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function MessageBubble({ msg }: { msg: ConversationMessage }) {
  if (msg.type === "tool") return <ToolPill content={msg.content} />;
  if (msg.type === "done") return <DoneBubble content={msg.content} />;
  if (msg.role === "user") return <UserBubble content={msg.content} attachments={msg.attachments} />;
  return <AssistantBubble content={msg.content} />;
}
