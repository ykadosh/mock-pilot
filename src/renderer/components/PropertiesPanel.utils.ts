import type { SelectedElement } from "../pages/Editor";

export function buildElementSelector(element: SelectedElement) {
  const classSelector = element.className
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";

  return `${element.tagName}${element.id ? `#${element.id}` : ""}${classSelector}`;
}
