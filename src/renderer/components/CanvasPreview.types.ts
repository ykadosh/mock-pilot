import type { SelectedElement } from "../pages/Editor";

export interface CanvasRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ElementTreeNode {
  mpId: string;
  tagName: string;
  id: string;
  className: string;
  children: ElementTreeNode[];
}

export interface CanvasPreviewHandle {
  applyModification: (mpId: string, newHTML: string, label?: string) => void;
  getElementHTML: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
  scrollToElement: (mpId: string) => void;
  getElementTree: () => ElementTreeNode[];
  highlightElement: (mpId: string) => void;
  clearHighlight: () => void;
  selectElement: (mpId: string) => void;
}

export interface CanvasPreviewProps {
  pickerActive?: boolean;
  rectSelectorActive?: boolean;
  panActive?: boolean;
  selectedMpId?: string | null;
  selectedSelector?: string;
  onElementSelected?: (element: SelectedElement) => void;
  onElementDeselected?: () => void;
  zoom?: number;
  viewportWidth?: number;
  projectId?: string;
  htmlContent?: string | null;
  assetsBasePath?: string | null;
}
