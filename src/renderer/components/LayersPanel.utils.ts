import type { ElementTreeNode } from "./CanvasPreview.types";

export function formatLayerLabel(node: ElementTreeNode) {
  let label = node.tagName;
  if (node.id) {
    label += `#${node.id}`;
  } else if (node.className) {
    const first = node.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    if (first) label += `.${first}`;
  }
  return label;
}

export function collectAncestorIds(roots: ElementTreeNode[], targetMpId: string | null | undefined): string[] {
  if (!targetMpId) return [];
  const path: string[] = [];
  const walk = (node: ElementTreeNode): boolean => {
    if (node.mpId === targetMpId) return true;
    for (const child of node.children) {
      if (walk(child)) {
        path.push(node.mpId);
        return true;
      }
    }
    return false;
  };
  for (const root of roots) walk(root);
  return path;
}
