import { useEffect, useRef, useState, type RefObject } from "react";
import type { SelectedElement } from "../pages/Editor";
import { getCapturedHtml } from "../lib/store";
import { PICKER_SCRIPT } from "./CanvasPreview.pickerScript";
import { RESIZE_SCRIPT } from "./CanvasPreview.resizeScript";
import type { CanvasRect } from "./CanvasPreview.types";
import { cleanHtml } from "./CanvasPreview.utils";

function postToIframe(iframeRef: RefObject<HTMLIFrameElement | null>, message: object) {
  iframeRef.current?.contentWindow?.postMessage(message, "*");
}

function injectScript(doc: Document, scriptText: string) {
  const script = doc.createElement("script");
  script.setAttribute("data-mp-injected", "true");
  script.textContent = scriptText;
  doc.body.appendChild(script);
}

function getPickerMessage(pickerActive?: boolean, selectedMpId?: string | null) {
  if (selectedMpId) return { type: "picker-highlight", mpId: selectedMpId };
  if (pickerActive) return { type: "picker-activate" };
  return { type: "picker-deactivate" };
}

function useIframeLoadHandler(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const [iframeLoadId, setIframeLoadId] = useState(0);
  const handleIframeLoad = () => {
    const doc = iframeRef.current?.contentWindow?.document;
    if (!doc?.body) return;
    doc.documentElement.style.overflow = "hidden";
    doc.body.style.overflow = "hidden";
    injectScript(doc, RESIZE_SCRIPT);
    injectScript(doc, PICKER_SCRIPT);
    setIframeLoadId((value) => value + 1);
  };
  return { handleIframeLoad, iframeLoadId };
}

function useIframeHeight(iframeRef: RefObject<HTMLIFrameElement | null>, viewportWidth: number) {
  const [iframeHeight, setIframeHeight] = useState(800);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "iframe-height" && typeof event.data.height === "number") setIframeHeight(event.data.height);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    setIframeHeight(1);
    const timer = setTimeout(() => postToIframe(iframeRef, { type: "measure-height" }), 50);
    return () => clearTimeout(timer);
  }, [iframeRef, viewportWidth]);
  return iframeHeight;
}

function usePickerSync({ iframeRef, iframeLoadId, pickerActive, selectedMpId }: { iframeRef: RefObject<HTMLIFrameElement | null>; iframeLoadId: number; pickerActive?: boolean; selectedMpId?: string | null }) {
  useEffect(() => {
    postToIframe(iframeRef, getPickerMessage(pickerActive, selectedMpId));
  }, [iframeLoadId, iframeRef, pickerActive, selectedMpId]);
}

function useSelectedRect(selectedMpId: string | null | undefined, onElementSelected?: (element: SelectedElement) => void, onElementDeselected?: () => void) {
  const [selectedRect, setSelectedRect] = useState<CanvasRect | null>(null);
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "element-rect-update" && data.rect) return setSelectedRect(data.rect);
      if (data.type === "element-selected") {
        if (data.data?.rect) setSelectedRect(data.data.rect);
        onElementSelected?.(data.data);
        return;
      }
      if (data.type === "element-deselected") {
        setSelectedRect(null);
        onElementDeselected?.();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onElementDeselected, onElementSelected]);
  useEffect(() => {
    if (!selectedMpId) setSelectedRect(null);
  }, [selectedMpId]);
  return selectedRect;
}

export function useCanvasHtml(htmlContent?: string | null, reloadEpoch?: number) {
  const [html, setHtml] = useState<string | null>(null);
  const initialCleanDone = useRef(false);
  const htmlContentRef = useRef(htmlContent);
  htmlContentRef.current = htmlContent;
  const lastEpochRef = useRef<number | undefined>(undefined);
  const epochGated = reloadEpoch !== undefined;
  useEffect(() => {
    const current = htmlContentRef.current;
    if (current === undefined) {
      setHtml(cleanHtml(getCapturedHtml()));
      return;
    }
    if (epochGated && reloadEpoch === lastEpochRef.current) return;
    lastEpochRef.current = reloadEpoch;
    setHtml(initialCleanDone.current ? current : cleanHtml(current));
    initialCleanDone.current = true;
  }, [epochGated, reloadEpoch, htmlContent]);
  return html;
}



export function useIframeSetup({
  iframeRef,
  pickerActive,
  selectedMpId,
  viewportWidth,
  onElementSelected,
  onElementDeselected,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  pickerActive?: boolean;
  selectedMpId?: string | null;
  viewportWidth: number;
  onElementSelected?: (element: SelectedElement) => void;
  onElementDeselected?: () => void;
}) {
  const { handleIframeLoad, iframeLoadId } = useIframeLoadHandler(iframeRef);
  const iframeHeight = useIframeHeight(iframeRef, viewportWidth);
  const selectedRect = useSelectedRect(selectedMpId, onElementSelected, onElementDeselected);
  usePickerSync({ iframeRef, iframeLoadId, pickerActive, selectedMpId });
  return { handleIframeLoad, iframeHeight, selectedRect };
}
