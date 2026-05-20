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
body { margin: 0; padding: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; width: max-content; height: max-content; }
* { box-sizing: border-box; }
</style></head><body>${html}</body></html>`);
    doc.close();

    // Scale content to fit within the iframe (object-fit: contain behavior)
    iframe.onload = () => scaleToFit(iframe);
    scaleToFit(iframe);
  }, [html, css]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      className="border-outline/20 aspect-[4/3] w-full rounded border bg-white"
      title="Component preview"
    />
  );
}

function scaleToFit(iframe: HTMLIFrameElement) {
  const doc = iframe.contentDocument;
  if (!doc?.body) return;

  // Wait a frame for layout to settle
  requestAnimationFrame(() => {
    const body = doc.body;
    const contentWidth = body.scrollWidth;
    const contentHeight = body.scrollHeight;
    const frameWidth = iframe.clientWidth;
    const frameHeight = iframe.clientHeight;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const scaleX = frameWidth / contentWidth;
    const scaleY = frameHeight / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

    body.style.transformOrigin = "top left";
    body.style.transform = `scale(${scale})`;
    body.style.width = `${contentWidth}px`;
    body.style.height = `${contentHeight}px`;

    // Center the scaled content
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    const offsetX = (frameWidth - scaledWidth) / 2;
    const offsetY = (frameHeight - scaledHeight) / 2;
    body.style.position = "absolute";
    body.style.left = `${offsetX}px`;
    body.style.top = `${offsetY}px`;
  });
}
