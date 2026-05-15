// Simple in-memory store for the captured website HTML
let capturedHtml: string | null = null;
let assetsBasePath: string | null = null;

export function setCapturedHtml(html: string, basePath?: string) {
  capturedHtml = html;
  assetsBasePath = basePath || null;
}

export function getCapturedHtml(): string | null {
  return capturedHtml;
}

export function getAssetsBasePath(): string | null {
  return assetsBasePath;
}
