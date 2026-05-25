import { CanvasPreview } from "../../components/CanvasPreview";
import { CodeEditor } from "../../components/CodeEditor";
import { ConversationPanel } from "../../components/ConversationPanel";
import { HistoryPanel } from "../../components/HistoryPanel";
import { PromptBox } from "../../components/PromptBox";
import { usePromptBox } from "../../components/PromptBox.hooks";
import { PropertiesPanel } from "../../components/PropertiesPanel";
import { buildSelectedSelector } from "./Editor.utils";
import type { EditorState } from "./Editor.hooks";

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
    return <ConversationPanel messages={state.conversationMessages} agentProcessing={state.agentProcessing} awaitingContinue={state.awaitingContinue} currentTool={state.currentTool} onClose={() => state.handleToolClick("Chat")} onContinue={state.onContinue} />;
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
  const promptBox = usePromptBox({
    onApplyModification: state.handleApplyModification,
    onApplyPageModification: state.handleApplyPageModification,
    getElementHTML: (mpId: string) => state.canvasRef.current?.getElementHTML(mpId) ?? Promise.resolve(null),
    getFullPageHTML: () => state.currentHtml ?? null,
    onConversationMessage: state.addConversationMessage,
    openChat: state.openChat,
  });

  return (
    <>
      <WorkspaceContent {...state} />
      <WorkspaceSidePanel {...state} agentProcessing={promptBox.agentProcessing || promptBox.loading} awaitingContinue={promptBox.awaitingContinue} currentTool={promptBox.agentProgress?.toolName} onContinue={promptBox.handleContinue} />
      {!state.codeEditorOpen && <PromptBox {...promptBox} selectedElement={state.selectedElement} />}
    </>
  );
}

