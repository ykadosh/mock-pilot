import type { SelectedElement } from "./Editor";

export type DevicePreset = "mobile" | "tablet" | "laptop" | "widescreen";
export type EditorTool = "Element Picker" | "Rectangle Selector" | "Pan Tool" | "History" | "Layers" | "Chat";

export const EDITOR_TOOLS: ReadonlySet<EditorTool> = new Set(["Element Picker", "Rectangle Selector", "Pan Tool"]);
export const INFORMATIONAL_TOOLS: ReadonlySet<EditorTool> = new Set(["History", "Layers", "Chat"]);

export function isEditorTool(tool: string): tool is EditorTool {
  return EDITOR_TOOLS.has(tool as EditorTool) || INFORMATIONAL_TOOLS.has(tool as EditorTool);
}

export function isInformationalTool(tool: string): boolean {
  return INFORMATIONAL_TOOLS.has(tool as EditorTool);
}

export const DEVICE_SIZES: Record<DevicePreset, { width: number; height: number; icon: string; label: string }> = {
  mobile: { width: 390, height: 844, icon: "smartphone", label: "Mobile" },
  tablet: { width: 768, height: 1024, icon: "tablet_mac", label: "Tablet" },
  laptop: { width: 1280, height: 800, icon: "laptop", label: "Laptop" },
  widescreen: { width: 1536, height: 960, icon: "desktop_windows", label: "Widescreen" },
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
