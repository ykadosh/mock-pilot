import { CanvasPreview } from "../../components/CanvasPreview";
import { CodeEditor } from "../../components/CodeEditor";
import { HistoryPanel } from "../../components/HistoryPanel";
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
      onApplyModification={state.handleApplyModification}
      getElementHTML={() => state.canvasRef.current?.getElementHTML(state.selectedElement?.mpId || "") ?? Promise.resolve(null)}
    />
  );
}

export function EditorWorkspace({ state }: { state: EditorState }) {
  return (
    <>
      <WorkspaceContent {...state} />
      <WorkspaceSidePanel {...state} />
    </>
  );
}
