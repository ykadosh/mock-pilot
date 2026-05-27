import { CanvasPreview } from "../../components/CanvasPreview";
import { CodeEditor } from "../../components/CodeEditor";
import { ConversationPanel } from "../../components/ConversationPanel";
import { HistoryPanel } from "../../components/HistoryPanel";
import { PromptBox } from "../../components/PromptBox";
import { usePromptBox } from "../../components/PromptBox.hooks";
import { PropertiesPanel } from "../../components/PropertiesPanel";
import { buildSelectedSelector } from "./Editor.utils";
import type { EditorState } from "./Editor.hooks";
import { useEffect } from "react";

function WorkspaceContent(state: EditorState) {
  if (state.codeEditorOpen && state.currentHtml) {
    return (
      <CodeEditor
        ref={state.codeEditorRef}
        htmlContent={state.currentHtml}
        onUpdate={state.handleCodeUpdate}
        activeTab={state.codeTab}
        onDirtyChange={state.setCodeDirty}
      />
    );
  }

  return (
    <CanvasPreview
      ref={state.canvasRef}
      pickerActive={state.pickerActive}
      rectSelectorActive={state.rectSelectorActive}
      panActive={state.panActive}
      selectedMpId={state.selectedElement?.mpId || null}
      selectedSelector={buildSelectedSelector(state.selectedElement)}
      onElementSelected={state.handleElementSelected}
      onElementDeselected={state.handleSelectionClear}
      zoom={state.zoom}
      viewportWidth={state.viewportWidth}
      projectId={state.projectId}
      htmlContent={state.currentHtml}
      assetsBasePath={state.assetsBasePath}
    />
  );
}

function WorkspaceSidePanel(state: EditorState & { agentProcessing?: boolean; awaitingContinue?: boolean; currentTool?: string; onContinue?: () => void }) {
  if (state.historyOpen) {
    return <HistoryPanel entries={state.entries} pointer={state.pointer} onGoTo={state.goTo} onClose={() => state.handleToolClick("History")} />;
  }

  if (state.chatOpen) {
    return (
      <ConversationPanel
        sessions={state.conversation.sessions}
        activeSessionId={state.conversation.activeSessionId}
        activeTitle={state.conversation.activeSessionMeta?.title ?? "Conversation"}
        messages={state.conversationMessages}
        agentProcessing={state.agentProcessing}
        awaitingContinue={state.awaitingContinue}
        currentTool={state.currentTool}
        isReadOnly={!state.conversation.isActiveLatest}
        onClose={() => state.handleToolClick("Chat")}
        onContinue={state.onContinue}
        onNewConversation={() => { void state.conversation.newConversation(); }}
        onSelectSession={(id) => { void state.conversation.switchSession(id); }}
      />
    );
  }

  if (!state.selectedElement) return null;
  return (
    <PropertiesPanel
      element={state.selectedElement}
      onClose={state.handleSelectionClear}
    />
  );
}

export function EditorWorkspace({ state }: { state: EditorState }) {
  const readOnlyConversation = !state.conversation.isActiveLatest;
  const promptBox = usePromptBox({
    onApplyModification: state.handleApplyModification,
    onApplyPageModification: state.handleApplyPageModification,
    getElementHTML: (mpId: string) => state.canvasRef.current?.getElementHTML(mpId) ?? Promise.resolve(null),
    getFullPageHTML: () => state.currentHtml ?? null,
    onConversationMessage: state.addConversationMessage,
    openChat: state.openChat,
    getPreviousAgentMessages: state.conversation.getAgentMessages,
    onAgentMessagesUpdate: state.conversation.setAgentMessages,
    readOnly: readOnlyConversation,
  });

  const agentBusy = promptBox.agentProcessing || promptBox.loading;
  const { setSelectedElement } = state;
  useEffect(() => {
    if (agentBusy) setSelectedElement(null);
  }, [agentBusy, setSelectedElement]);

  return (
    <>
      <WorkspaceContent {...state} />
      <WorkspaceSidePanel {...state} agentProcessing={promptBox.agentProcessing || promptBox.loading} awaitingContinue={promptBox.awaitingContinue} currentTool={promptBox.agentProgress?.toolName} onContinue={promptBox.handleContinue} />
      {!state.codeEditorOpen && (
        <PromptBox
          {...promptBox}
          selectedElement={state.selectedElement}
          readOnly={readOnlyConversation}
          onStartNewConversation={() => {
            void state.conversation.newConversation();
            state.openChat();
          }}
        />
      )}
    </>
  );
}

