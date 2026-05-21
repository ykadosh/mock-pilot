import type { SelectedElement } from "./Editor";

export type DevicePreset = "desktop" | "tablet" | "phone";
export type EditorTool = "Element Picker" | "Rectangle Selector" | "Pan Tool" | "History" | "Chat";

export const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

export function buildSelectedSelector(element: SelectedElement | null) {
  if (!element) return undefined;
  if (element.id) return `${element.tagName}#${element.id}`;

  const classes = element.className.trim().split(/\s+/).slice(0, 2).join(".");
  return classes ? `${element.tagName}.${classes}` : element.tagName;
}

export function getEditorRoute(projectId?: string) {
  return projectId ? `/editor/${projectId}` : "/editor";
}
