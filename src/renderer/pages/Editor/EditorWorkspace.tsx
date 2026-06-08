import { CanvasPreview } from "../../components/CanvasPreview";
import { CodeEditor } from "../../components/CodeEditor";
import { ConversationPanel } from "../../components/ConversationPanel";
import { HistoryPanel } from "../../components/HistoryPanel";
import { LayersPanel } from "../../components/LayersPanel";
import { PromptBox } from "../../components/PromptBox";
import { usePromptBox } from "../../components/PromptBox.hooks";
import { PropertiesPanel } from "../../components/PropertiesPanel";
import { usePromptAttachments } from "../../hooks/usePromptAttachments";
import { useProjectDesignStatus } from "../../hooks/useProjectDesignStatus";
import { buildSelectedSelector } from "./Editor.utils";
import { ExitBlockerDialog } from "./ExitBlockerDialog";
import type { EditorState } from "./Editor.hooks";
import { useCallback, useEffect } from "react";
import { useBlocker } from "react-router-dom";

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
      reloadEpoch={state.reloadEpoch}
      assetsBasePath={state.assetsBasePath}
    />
  );
}

function WorkspaceSidePanel(state: EditorState & { agentProcessing?: boolean; awaitingContinue?: boolean; currentTool?: string; onContinue?: () => void }) {
  if (state.historyOpen) {
    return <HistoryPanel entries={state.entries} pointer={state.pointer} onGoTo={state.goTo} onClose={() => state.handleToolClick("History")} />;
  }
  if (state.layersOpen) {
    return <LayersPanel canvasRef={state.canvasRef} selectedMpId={state.selectedElement?.mpId || null} htmlVersion={state.currentHtml} onClose={() => state.handleToolClick("Layers")} />;
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

  if (state.propertiesOpen) {
    return (
      <PropertiesPanel
        element={state.selectedElement}
        onClose={() => state.handleToolClick("Properties")}
      />
    );
  }

  return null;
}

function WorkspacePromptBox({ state, promptBox, readOnly, designActive }: { state: EditorState; promptBox: ReturnType<typeof usePromptBox>; readOnly: boolean; designActive: boolean }) {
  return (
    <PromptBox
      {...promptBox}
      designActive={designActive}
      selectedElement={state.selectedElement}
      readOnly={readOnly}
      onStartNewConversation={() => { void state.conversation.newConversation(); state.openChat(); }}
      onSelectElementAttachment={(attachment) => {
        state.setSelectedElement(attachment.element);
        state.canvasRef.current?.scrollToElement(attachment.element.mpId);
      }}
    />
  );
}

export function EditorWorkspace({ state }: { state: EditorState }) {
  const readOnlyConversation = !state.conversation.isActiveLatest;
  const { attachments, setAttachments } = usePromptAttachments(state.projectId);
  const designActive = useProjectDesignStatus(state.projectId);
  const promptBox = usePromptBox({
    attachments,
    setAttachments,
    onApplyModification: state.handleApplyModification,
    onApplyPageModification: state.handleApplyPageModification,
    getElementHTML: (mpId: string) => state.canvasRef.current?.getElementHTML(mpId) ?? Promise.resolve(null),
    getFullPageHTML: () => state.currentHtml ?? null,
    onConversationMessage: state.addConversationMessage,
    openChat: state.openChat,
    getPreviousAgentMessages: state.conversation.getAgentMessages,
    onAgentMessagesUpdate: state.conversation.setAgentMessages,
    readOnly: readOnlyConversation,
    projectId: state.projectId,
    getActiveSessionId: () => state.conversation.activeSessionId,
  });

  const agentBusy = promptBox.agentProcessing || promptBox.loading;
  const { setSelectedElement } = state;
  useEffect(() => { if (agentBusy) setSelectedElement(null); }, [agentBusy, setSelectedElement]);

  const blocker = useBlocker(agentBusy);
  const handleConfirmExit = useCallback(async () => {
    await promptBox.handleCancel();
    blocker.proceed?.();
  }, [blocker, promptBox]);

  return (
    <>
      <WorkspaceContent {...state} />
      <WorkspaceSidePanel {...state} agentProcessing={agentBusy} awaitingContinue={promptBox.awaitingContinue} currentTool={promptBox.agentProgress?.toolName} onContinue={promptBox.handleContinue} />
      {!state.codeEditorOpen && <WorkspacePromptBox state={state} promptBox={promptBox} readOnly={readOnlyConversation} designActive={designActive} />}
      <ExitBlockerDialog open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} onConfirm={handleConfirmExit} />
    </>
  );
}

