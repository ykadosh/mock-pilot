import { useRef, useEffect, useCallback, type MutableRefObject } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";

type Tab = "html" | "css";

type UpdateHandler = (fullHtml: string, label: string) => void;
type DirtyHandler = (dirty: boolean) => void;

type UseCodeEditorOptions = {
  activeTab: Tab;
  htmlContent: string;
  onUpdate: UpdateHandler;
  onDirtyChange?: DirtyHandler;
};

type EditorDocRefs = {
  htmlDocRef: MutableRefObject<string>;
  cssDocRef: MutableRefObject<string>;
  initialHtmlRef: MutableRefObject<string>;
  initialCssRef: MutableRefObject<string>;
};

type EditorRefs = EditorDocRefs & {
  editorContainerRef: MutableRefObject<HTMLDivElement | null>;
  editorViewRef: MutableRefObject<EditorView | null>;
  onDirtyChangeRef: MutableRefObject<DirtyHandler | undefined>;
};

function useLatestRef<T>(value: T) {
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  return valueRef;
}

function extractParts(fullHtml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");
  const styleTags = doc.querySelectorAll("style");
  const cssContent = Array.from(styleTags).map((tag) => tag.textContent || "").join("\n\n");

  styleTags.forEach((tag) => tag.remove());
  return { bodyHtml: doc.body?.innerHTML.trim() || "", cssContent: cssContent.trim() };
}

function reassemble(originalHtml: string, newBodyHtml: string, newCss: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalHtml, "text/html");

  doc.body.innerHTML = newBodyHtml;
  doc.querySelectorAll("style").forEach((tag) => tag.remove());
  if (newCss.trim()) {
    const style = doc.createElement("style");
    style.textContent = newCss;
    doc.head.appendChild(style);
  }
  return "<!DOCTYPE html><html>" + doc.documentElement.innerHTML + "</html>";
}

function updateDirtyState({ htmlDocRef, cssDocRef, initialHtmlRef, initialCssRef, onDirtyChangeRef }: EditorRefs) {
  const isDirty = htmlDocRef.current !== initialHtmlRef.current || cssDocRef.current !== initialCssRef.current;
  onDirtyChangeRef.current?.(isDirty);
}

function applyDocChange({ tab, value, refs }: { tab: Tab; value: string; refs: EditorRefs }) {
  if (tab === "html") {
    refs.htmlDocRef.current = value;
  } else {
    refs.cssDocRef.current = value;
  }
  updateDirtyState(refs);
}

function createEditorState(tab: Tab, content: string, onDocChange: (value: string) => void) {
  const language = tab === "html" ? html() : css();
  return EditorState.create({
    doc: content,
    extensions: [
      basicSetup,
      language,
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--color-background)" },
        ".cm-scroller": { overflow: "auto" },
        ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        ".cm-gutters": { backgroundColor: "var(--color-background)", borderRight: "none" },
      }, { dark: true }),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onDocChange(update.state.doc.toString());
        }
      }),
    ],
  });
}

function destroyEditor(editorViewRef: MutableRefObject<EditorView | null>) {
  editorViewRef.current?.destroy();
  editorViewRef.current = null;
}

function mountEditor(tab: Tab, refs: EditorRefs) {
  if (!refs.editorContainerRef.current) return;
  destroyEditor(refs.editorViewRef);

  const content = tab === "html" ? refs.htmlDocRef.current : refs.cssDocRef.current;
  const onDocChange = (value: string) => applyDocChange({ tab, value, refs });
  refs.editorViewRef.current = new EditorView({
    state: createEditorState(tab, content, onDocChange),
    parent: refs.editorContainerRef.current,
  });
}

export function useCodeEditor({ activeTab, htmlContent, onUpdate, onDirtyChange }: UseCodeEditorOptions) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const htmlDocRef = useRef("");
  const cssDocRef = useRef("");
  const initialHtmlRef = useRef("");
  const initialCssRef = useRef("");
  const initializedRef = useRef(false);
  const sourceHtmlRef = useLatestRef(htmlContent);
  const onUpdateRef = useLatestRef(onUpdate);
  const onDirtyChangeRef = useLatestRef(onDirtyChange);

  useEffect(() => {
    if (initializedRef.current) return;
    const { bodyHtml, cssContent } = extractParts(htmlContent);
    htmlDocRef.current = bodyHtml;
    cssDocRef.current = cssContent;
    initialHtmlRef.current = bodyHtml;
    initialCssRef.current = cssContent;
    initializedRef.current = true;
  }, [htmlContent]);

  useEffect(() => {
    mountEditor(activeTab, { editorContainerRef, editorViewRef, htmlDocRef, cssDocRef, initialHtmlRef, initialCssRef, onDirtyChangeRef });
    return () => destroyEditor(editorViewRef);
  }, [activeTab, onDirtyChangeRef]);

  const update = useCallback(() => {
    const fullHtml = reassemble(sourceHtmlRef.current, htmlDocRef.current, cssDocRef.current);
    onUpdateRef.current(fullHtml, "Code edit");
    initialHtmlRef.current = htmlDocRef.current;
    initialCssRef.current = cssDocRef.current;
    onDirtyChangeRef.current?.(false);
  }, [onDirtyChangeRef, onUpdateRef, sourceHtmlRef]);

  return { editorContainerRef, update };
}
