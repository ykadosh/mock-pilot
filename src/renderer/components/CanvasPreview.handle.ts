import { useImperativeHandle, type ForwardedRef, type RefObject } from "react";
import { scrollElementIntoView } from "./CanvasPreview.scroll";
import type { CanvasPreviewHandle } from "./CanvasPreview.types";

function postToIframe(iframeRef: RefObject<HTMLIFrameElement | null>, message: object) {
  iframeRef.current?.contentWindow?.postMessage(message, "*");
}

function getElementHTML(iframeRef: RefObject<HTMLIFrameElement | null>, mpId: string) {
  return new Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>((resolve) => {
    if (!iframeRef.current?.contentWindow) return resolve(null);
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "element-html-response" || event.data.mpId !== mpId) return;
      window.removeEventListener("message", handler);
      resolve(event.data.outerHTML ? { outerHTML: event.data.outerHTML, computedStyle: event.data.computedStyle } : null);
    };
    window.addEventListener("message", handler);
    postToIframe(iframeRef, { type: "get-element-html", mpId });
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(null);
    }, 2000);
  });
}

interface CanvasPreviewHandleRefs {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  scaleRef: RefObject<number>;
}

export function useCanvasPreviewHandle(ref: ForwardedRef<CanvasPreviewHandle>, refs: CanvasPreviewHandleRefs) {
  const { iframeRef, scrollContainerRef, scaleRef } = refs;
  useImperativeHandle(ref, () => ({
    applyModification(mpId, newHTML, label) {
      postToIframe(iframeRef, { type: "apply-modification", mpId, html: newHTML, label: label || "AI modification" });
    },
    getElementHTML(mpId) {
      return getElementHTML(iframeRef, mpId);
    },
    scrollToElement(mpId) {
      scrollElementIntoView({ iframe: iframeRef.current, container: scrollContainerRef.current, mpId, scale: scaleRef.current || 1 });
    },
  }), [iframeRef, scaleRef, scrollContainerRef]);
}
