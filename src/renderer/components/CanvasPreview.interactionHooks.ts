import { useEffect, useRef, useState, type RefObject } from "react";
import type { SelectionRect } from "./CanvasPreview.types";

type RectDragState = {
  isDraggingRectRef: { current: boolean };
  rectStartRef: { current: { x: number; y: number } | null };
  selectionRectRef: { current: SelectionRect | null };
  setSelectionRect: (value: SelectionRect | null) => void;
};

function clearSelection(state: RectDragState) {
  state.isDraggingRectRef.current = false;
  state.rectStartRef.current = null;
  state.selectionRectRef.current = null;
  state.setSelectionRect(null);
}

function getContentCoords(container: HTMLDivElement, event: MouseEvent, scale: number) {
  const wrapper = container.querySelector("[data-canvas-wrapper]") as HTMLElement | null;
  if (!wrapper) return { x: 0, y: 0 };
  const rect = wrapper.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
}

function bindRectSelection({ container, iframeRef, scale, state }: { container: HTMLDivElement; iframeRef: RefObject<HTMLIFrameElement | null>; scale: number; state: RectDragState }) {
  const handleMouseDown = (event: MouseEvent) => {
    state.isDraggingRectRef.current = false;
    state.selectionRectRef.current = null;
    state.setSelectionRect(null);
    state.rectStartRef.current = getContentCoords(container, event, scale);
  };
  const handleMouseMove = (event: MouseEvent) => {
    if (!state.rectStartRef.current) return;
    state.isDraggingRectRef.current = true;
    const coords = getContentCoords(container, event, scale);
    const start = state.rectStartRef.current;
    const rect = { x: Math.min(start.x, coords.x), y: Math.min(start.y, coords.y), w: Math.abs(coords.x - start.x), h: Math.abs(coords.y - start.y) };
    state.selectionRectRef.current = rect;
    state.setSelectionRect(rect);
  };
  const handleMouseUp = () => {
    const rect = state.selectionRectRef.current;
    if (state.rectStartRef.current && state.isDraggingRectRef.current && rect && rect.w > 5 && rect.h > 5) iframeRef.current?.contentWindow?.postMessage({ type: "rect-select", rect: { top: rect.y, left: rect.x, width: rect.w, height: rect.h } }, "*");
    clearSelection(state);
  };
  container.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  return () => {
    container.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    clearSelection(state);
  };
}

export function usePanMode(scrollContainerRef: RefObject<HTMLDivElement | null>, panActive?: boolean) {
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isPanning, setIsPanning] = useState(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !panActive) return;
    const handleMouseDown = (event: MouseEvent) => {
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = { x: event.clientX, y: event.clientY, scrollLeft: container.scrollLeft, scrollTop: container.scrollTop };
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!isPanningRef.current) return;
      event.preventDefault();
      container.scrollLeft = panStartRef.current.scrollLeft - (event.clientX - panStartRef.current.x);
      container.scrollTop = panStartRef.current.scrollTop - (event.clientY - panStartRef.current.y);
    };
    const handleMouseUp = () => {
      isPanningRef.current = false;
      setIsPanning(false);
    };
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      isPanningRef.current = false;
    };
  }, [panActive, scrollContainerRef]);
  return isPanning;
}

export function useRectSelection({
  iframeRef,
  rectSelectorActive,
  scale,
  scrollContainerRef,
}: {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  rectSelectorActive?: boolean;
  scale: number;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const isDraggingRectRef = useRef(false);
  const rectStartRef = useRef<{ x: number; y: number } | null>(null);
  const selectionRectRef = useRef<SelectionRect | null>(null);
  useEffect(() => {
    const container = scrollContainerRef.current;
    const state = { isDraggingRectRef, rectStartRef, selectionRectRef, setSelectionRect };
    if (!container || !rectSelectorActive) return clearSelection(state);
    return bindRectSelection({ container, iframeRef, scale, state });
  }, [iframeRef, rectSelectorActive, scale, scrollContainerRef]);
  return selectionRect;
}
