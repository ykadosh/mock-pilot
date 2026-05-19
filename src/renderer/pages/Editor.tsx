import { TopNav } from "../components/layout/TopNav";
import { SideNav } from "../components/layout/SideNav";
import { useEditorState } from "./Editor.hooks";
import { EditorToolbar } from "./EditorToolbar";
import { EditorWorkspace } from "./EditorWorkspace";

export interface SelectedElement {
  tagName: string;
  id: string;
  className: string;
  computedStyle: Record<string, string>;
  outerHTML: string;
  cssPath: string;
  mpId: string;
  rect?: { top: number; left: number; width: number; height: number };
}

export function Editor({ codeEditorDefault = false }: { codeEditorDefault?: boolean }) {
  const state = useEditorState(codeEditorDefault);

  return (
    <div className="flex h-screen flex-col overflow-hidden select-none">
      <TopNav activeTab={state.codeEditorOpen ? "code-editor" : "editor"} projectId={state.projectId} />
      {!state.codeEditorOpen && <SideNav activeTool={state.activeTool || undefined} onToolClick={state.handleToolClick} />}
      <div className="flex min-h-0 flex-1">
        <main className="bg-background relative flex h-full min-w-0 flex-1 flex-col">
          <EditorToolbar state={state} />
          <EditorWorkspace state={state} />
        </main>
      </div>
    </div>
  );
}
