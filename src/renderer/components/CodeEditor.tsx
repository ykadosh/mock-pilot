import { forwardRef, useImperativeHandle } from "react";
import { useCodeEditor } from "./CodeEditor.hooks";

type Tab = "html" | "css";

export interface CodeEditorHandle {
  update: () => void;
}

interface CodeEditorProps {
  htmlContent: string;
  onUpdate: (fullHtml: string, label: string) => void;
  activeTab: Tab;
  onDirtyChange?: (dirty: boolean) => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(props, ref) {
  const { editorContainerRef, update } = useCodeEditor(props);

  useImperativeHandle(ref, () => ({ update }), [update]);

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <div ref={editorContainerRef} className="min-h-0 flex-1 overflow-hidden" />
    </div>
  );
});
