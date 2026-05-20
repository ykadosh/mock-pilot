import { useEffect, useRef } from "react";
import { CanvasPreview } from "../../components/CanvasPreview";
import { CodeEditor } from "../../components/CodeEditor";
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

function WorkspaceSidePanel(state: EditorState) {
  if (state.historyOpen) {
    return <HistoryPanel entries={state.entries} pointer={state.pointer} onGoTo={state.goTo} onClose={() => state.handleToolClick("History")} />;
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
  });

  // When an element is selected via the picker, add it as an attachment
  const prevMpIdRef = useRef<string | null>(null);
  const { addElementAttachment } = promptBox;
  useEffect(() => {
    if (state.selectedElement && state.selectedElement.mpId !== prevMpIdRef.current) {
      addElementAttachment(state.selectedElement);
    }
    prevMpIdRef.current = state.selectedElement?.mpId ?? null;
  }, [state.selectedElement, addElementAttachment]);

  return (
    <>
      <WorkspaceContent {...state} />
      <WorkspaceSidePanel {...state} />
      {!state.codeEditorOpen && <PromptBox {...promptBox} />}
    </>
  );
}

