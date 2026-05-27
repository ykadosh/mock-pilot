import { useState } from "react";
import type { ConversationMessage, SessionMeta } from "../hooks/useConversation";
import { DetailView, ListView } from "./ConversationPanel.views";
import { SidePanel } from "./ui/SidePanel";

interface ConversationPanelProps {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  activeTitle: string;
  messages: ConversationMessage[];
  agentProcessing?: boolean;
  awaitingContinue?: boolean;
  currentTool?: string;
  isReadOnly?: boolean;
  onClose: () => void;
  onContinue?: () => void;
  onNewConversation: () => void;
  onSelectSession: (id: string) => void;
}

type View = "list" | "detail";

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <>
      <button onClick={onBack} className="flex cursor-pointer items-center text-slate-400 hover:text-slate-200" title="Show conversations">
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_back</span>
      </button>
      <span className="truncate text-[12px] font-medium text-slate-200">{title}</span>
    </>
  );
}

function ListHeader() {
  return <span className="font-label-caps text-label-caps text-slate-300">CONVERSATIONS</span>;
}

function NewConversationButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex cursor-pointer items-center text-slate-400 hover:text-violet-300" title="New conversation">
      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>add</span>
    </button>
  );
}

export function ConversationPanel(props: ConversationPanelProps) {
  const [view, setView] = useState<View>("detail");

  const headerLeft = view === "detail"
    ? <DetailHeader title={props.activeTitle} onBack={() => setView("list")} />
    : <ListHeader />;
  const headerRight = view === "list"
    ? <NewConversationButton onClick={() => { props.onNewConversation(); setView("detail"); }} />
    : undefined;

  const handleSelect = (id: string) => {
    props.onSelectSession(id);
    setView("detail");
  };

  return (
    <SidePanel headerLeft={headerLeft} headerRight={headerRight} onClose={props.onClose}>
      <div className="relative h-full overflow-hidden">
        <div
          className="flex h-full w-[200%] transition-transform duration-300 ease-out"
          style={{ transform: view === "detail" ? "translateX(-50%)" : "translateX(0%)" }}
        >
          <div className="h-full w-1/2 shrink-0">
            <ListView sessions={props.sessions} activeSessionId={props.activeSessionId} onSelectSession={handleSelect} />
          </div>
          <div className="h-full w-1/2 shrink-0">
            <DetailView
              messages={props.messages}
              agentProcessing={props.agentProcessing}
              awaitingContinue={props.awaitingContinue}
              currentTool={props.currentTool}
              isReadOnly={props.isReadOnly}
              onContinue={props.onContinue}
            />
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
