import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasPreviewHandle, ElementTreeNode } from "./CanvasPreview.types";
import { collectAncestorIds } from "./LayersPanel.utils";

export function useElementTree(canvasRef: React.RefObject<CanvasPreviewHandle | null>, htmlVersion: unknown) {
  const [tree, setTree] = useState<ElementTreeNode[]>([]);

  const refresh = useCallback(() => {
    setTree(canvasRef.current?.getElementTree() ?? []);
  }, [canvasRef]);

  useEffect(() => {
    refresh();
    const timer = setTimeout(refresh, 200);
    const onMessage = (event: MessageEvent) => {
      const t = event.data?.type;
      if (t === "iframe-height" || t === "modification-applied") refresh();
    };
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [refresh, htmlVersion]);

  return tree;
}

export function useExpandedNodes(tree: ElementTreeNode[], selectedMpId?: string | null) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedMpId) return;
    const ancestors = collectAncestorIds(tree, selectedMpId);
    if (ancestors.length === 0) return;
    setExpanded((current) => {
      const next = new Set(current);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [selectedMpId, tree]);

  const toggle = useCallback((mpId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(mpId)) next.delete(mpId); else next.add(mpId);
      return next;
    });
  }, []);

  return { expanded, toggle };
}

export function useLayerActions(canvasRef: React.RefObject<CanvasPreviewHandle | null>) {
  const hoveredRef = useRef<string | null>(null);

  const onHover = useCallback((mpId: string) => {
    hoveredRef.current = mpId;
    canvasRef.current?.highlightElement(mpId);
  }, [canvasRef]);

  const onLeave = useCallback(() => {
    hoveredRef.current = null;
    canvasRef.current?.clearHighlight();
  }, [canvasRef]);

  const onSelect = useCallback((mpId: string) => {
    canvasRef.current?.clearHighlight();
    canvasRef.current?.selectElement(mpId);
    canvasRef.current?.scrollToElement(mpId);
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    return () => { canvas?.clearHighlight(); };
  }, [canvasRef]);

  return { onHover, onLeave, onSelect };
}
