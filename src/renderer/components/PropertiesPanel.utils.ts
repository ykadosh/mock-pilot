import type { SelectedElement } from "../pages/Editor";

export function buildElementSelector(element: SelectedElement) {
  const classSelector = element.className
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";

  return `${element.tagName}${element.id ? `#${element.id}` : ""}${classSelector}`;
}

export async function requestElementModification(
  element: SelectedElement,
  prompt: string,
  getElementHTML?: () => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>,
): Promise<{ html: string } | { error: string }> {
  const current = await getElementHTML?.();
  const result = await window.api.aiModifyElement({
    prompt,
    outerHTML: current?.outerHTML ?? element.outerHTML,
    computedStyle: current?.computedStyle ?? element.computedStyle,
  });

  if (result.success && result.html) {
    return { html: result.html };
  }

  return { error: result.error || "Failed to modify element" };
}

export function getModificationError(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}
