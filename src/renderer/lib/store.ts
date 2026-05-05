// Simple in-memory store for the captured website HTML
let capturedHtml: string | null = null;

export function setCapturedHtml(html: string) {
  capturedHtml = html;
}

export function getCapturedHtml(): string | null {
  return capturedHtml;
}
