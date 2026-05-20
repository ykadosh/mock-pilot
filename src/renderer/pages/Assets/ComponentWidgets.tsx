import { useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";

export function ComponentCodeBlock({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const state = EditorState.create({
      doc: html,
      extensions: [basicSetup, htmlLang(), oneDark, EditorView.editable.of(false), EditorState.readOnly.of(true)],
    });
    const view = new EditorView({ state, parent: containerRef.current });
    return () => { view.destroy(); };
  }, [html]);

  return <div ref={containerRef} className="mt-2 max-h-48 overflow-auto rounded text-xs" />;
}

export function ComponentPreview({ html, css }: { html: string; css?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html><head><style>
${css || ""}
body { margin: 0; padding: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 100%; }
* { max-width: 100%; box-sizing: border-box; }
</style></head><body>${html}</body></html>`);
    doc.close();
  }, [html, css]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      className="border-outline/20 h-24 w-full rounded border bg-white"
      title="Component preview"
    />
  );
}
