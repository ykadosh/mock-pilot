import { useImperativeHandle, type ForwardedRef, type RefObject } from "react";
import { scrollElementIntoView } from "./CanvasPreview.scroll";
import type { CanvasPreviewHandle, ElementTreeNode } from "./CanvasPreview.types";

function postToIframe(iframeRef: RefObject<HTMLIFrameElement | null>, message: object) {
  iframeRef.current?.contentWindow?.postMessage(message, "*");
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "BASE"]);

function ensureMpId(el: Element): string {
  let mpId = el.getAttribute("data-mp-id");
  if (!mpId) {
    mpId = `mp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    el.setAttribute("data-mp-id", mpId);
  }
  return mpId;
}

function buildTreeNode(el: Element): ElementTreeNode | null {
  if (SKIP_TAGS.has(el.tagName)) return null;
  if (el.getAttribute("data-mp-injected") === "true") return null;
  const className = typeof el.className === "string" ? el.className : "";
  const children: ElementTreeNode[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const node = buildTreeNode(el.children[i]);
    if (node) children.push(node);
  }
  return {
    mpId: ensureMpId(el),
    tagName: el.tagName.toLowerCase(),
    id: el.id || "",
    className: className.trim(),
    children,
  };
}

function getElementTree(iframeRef: RefObject<HTMLIFrameElement | null>): ElementTreeNode[] {
  const doc = iframeRef.current?.contentDocument;
  if (!doc?.body) return [];
  const roots: ElementTreeNode[] = [];
  for (let i = 0; i < doc.body.children.length; i++) {
    const node = buildTreeNode(doc.body.children[i]);
    if (node) roots.push(node);
  }
  return roots;
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
    applyFullHtml(newHTML, label) {
      postToIframe(iframeRef, { type: "apply-full-html", html: newHTML, label: label || "AI modification" });
    },
    getElementHTML(mpId) {
      return getElementHTML(iframeRef, mpId);
    },
    scrollToElement(mpId) {
      scrollElementIntoView({ iframe: iframeRef.current, container: scrollContainerRef.current, mpId, scale: scaleRef.current || 1 });
    },
    getElementTree() {
      return getElementTree(iframeRef);
    },
    highlightElement(mpId) {
      postToIframe(iframeRef, { type: "layers-hover", mpId });
    },
    clearHighlight() {
      postToIframe(iframeRef, { type: "layers-hover-clear" });
    },
    selectElement(mpId) {
      postToIframe(iframeRef, { type: "layers-select", mpId });
    },
  }), [iframeRef, scaleRef, scrollContainerRef]);
}
