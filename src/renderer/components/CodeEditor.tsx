import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";

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

function extractParts(fullHtml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");

  // Extract all <style> content
  const styleTags = doc.querySelectorAll("style");
  const cssContent = Array.from(styleTags)
    .map((s) => s.textContent || "")
    .join("\n\n");

  // Remove style tags from body/head for the HTML view
  styleTags.forEach((s) => s.remove());

  const bodyHtml = doc.body?.innerHTML || "";
  return { bodyHtml: bodyHtml.trim(), cssContent: cssContent.trim() };
}

function reassemble(originalHtml: string, newBodyHtml: string, newCss: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(originalHtml, "text/html");

  // Replace body innerHTML
  doc.body.innerHTML = newBodyHtml;

  // Remove existing style tags
  doc.querySelectorAll("style").forEach((s) => s.remove());

  // Add new style tag
  if (newCss.trim()) {
    const style = doc.createElement("style");
    style.textContent = newCss;
    doc.head.appendChild(style);
  }

  return "<!DOCTYPE html><html>" + doc.documentElement.innerHTML + "</html>";
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor({ htmlContent, onUpdate, activeTab, onDirtyChange }, ref) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const htmlDocRef = useRef("");
  const cssDocRef = useRef("");
  const initialHtmlRef = useRef("");
  const initialCssRef = useRef("");
  const initializedRef = useRef(false);

  // Parse the incoming HTML into parts on first load
  useEffect(() => {
    if (initializedRef.current) return;
    const { bodyHtml, cssContent } = extractParts(htmlContent);
    htmlDocRef.current = bodyHtml;
    cssDocRef.current = cssContent;
    initialHtmlRef.current = bodyHtml;
    initialCssRef.current = cssContent;
    initializedRef.current = true;
  }, [htmlContent]);

  const createEditor = useCallback((tab: Tab) => {
    if (!editorContainerRef.current) return;

    // Destroy existing editor
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }

    const content = tab === "html" ? htmlDocRef.current : cssDocRef.current;
    const lang = tab === "html" ? html() : css();

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        lang,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--color-background)" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          ".cm-gutters": { backgroundColor: "var(--color-background)", borderRight: "none" },
        }, { dark: true }),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            if (tab === "html") {
              htmlDocRef.current = value;
            } else {
              cssDocRef.current = value;
            }
            const isDirty = htmlDocRef.current !== initialHtmlRef.current || cssDocRef.current !== initialCssRef.current;
            onDirtyChange?.(isDirty);
          }
        }),
      ],
    });

    editorViewRef.current = new EditorView({
      state,
      parent: editorContainerRef.current,
    });
  }, []);

  useEffect(() => {
    createEditor(activeTab);
    return () => {
      editorViewRef.current?.destroy();
      editorViewRef.current = null;
    };
  }, [activeTab, createEditor]);

  useImperativeHandle(ref, () => ({
    update: () => {
      const fullHtml = reassemble(htmlContent, htmlDocRef.current, cssDocRef.current);
      onUpdate(fullHtml, "Code edit");
      initialHtmlRef.current = htmlDocRef.current;
      initialCssRef.current = cssDocRef.current;
      onDirtyChange?.(false);
    },
  }), [htmlContent, onUpdate, onDirtyChange]);

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <div ref={editorContainerRef} className="min-h-0 flex-1 overflow-hidden" />
    </div>
  );
});
