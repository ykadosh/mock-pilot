import type { SelectedElement } from "./Editor";

export type DevicePreset = "desktop" | "tablet" | "phone";
export type EditorTool = "Element Picker" | "Rectangle Selector" | "Pan Tool" | "History" | "Chat";

export const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

const MAX_SELECTOR_LENGTH = 25;

export function buildSelectedSelector(element: SelectedElement | null) {
  if (!element) return undefined;

  let selector: string;
  if (element.id) {
    selector = `${element.tagName}#${element.id}`;
  } else {
    const classes = element.className.trim().split(/\s+/).slice(0, 2).join(".");
    selector = classes ? `${element.tagName}.${classes}` : element.tagName;
  }

  return selector.length > MAX_SELECTOR_LENGTH ? `${selector.slice(0, MAX_SELECTOR_LENGTH)}…` : selector;
}

export function getEditorRoute(projectId?: string) {
  return projectId ? `/editor/${projectId}` : "/editor";
}
