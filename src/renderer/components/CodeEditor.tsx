import { useState, useRef, useEffect, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { oneDark } from "@codemirror/theme-one-dark";

type Tab = "html" | "css";

interface CodeEditorProps {
  htmlContent: string;
  onUpdate: (fullHtml: string, label: string) => void;
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

export function CodeEditor({ htmlContent, onUpdate }: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState<Tab>("html");
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const htmlDocRef = useRef("");
  const cssDocRef = useRef("");
  const initializedRef = useRef(false);

  // Parse the incoming HTML into parts on first load
  useEffect(() => {
    if (initializedRef.current) return;
    const { bodyHtml, cssContent } = extractParts(htmlContent);
    htmlDocRef.current = bodyHtml;
    cssDocRef.current = cssContent;
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
        oneDark,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            if (tab === "html") {
              htmlDocRef.current = value;
            } else {
              cssDocRef.current = value;
            }
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

  const handleUpdate = () => {
    const fullHtml = reassemble(htmlContent, htmlDocRef.current, cssDocRef.current);
    onUpdate(fullHtml, "Code edit");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#020617]">
      {/* Tabs + Update button */}
      <div className="flex items-center border-b border-[#334155] px-md h-10 shrink-0">
        <button
          onClick={() => setActiveTab("html")}
          className={`px-3 py-1.5 text-xs font-mono rounded-t cursor-pointer transition-colors ${
            activeTab === "html"
              ? "bg-slate-800 text-violet-400 border border-b-0 border-[#334155]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          HTML
        </button>
        <button
          onClick={() => setActiveTab("css")}
          className={`px-3 py-1.5 text-xs font-mono rounded-t cursor-pointer transition-colors ml-1 ${
            activeTab === "css"
              ? "bg-slate-800 text-violet-400 border border-b-0 border-[#334155]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          CSS
        </button>
        <div className="flex-1" />
        <button
          onClick={handleUpdate}
          className="px-3 py-1 text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white rounded cursor-pointer transition-colors"
        >
          Update
        </button>
      </div>

      {/* Editor area */}
      <div ref={editorContainerRef} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
}
