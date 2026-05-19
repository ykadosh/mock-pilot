import { getAssetsBasePath } from "../lib/store";

export function cleanHtml(html: string | null): string | null {
  if (!html) return html;
  let cleanedHtml = html.replace(/<(?:base|br|hr|img|input|link|meta)\b[^>]*data-mp-injected[^>]*\/?>/gi, "");
  cleanedHtml = cleanedHtml.replace(/<[^>]+data-mp-injected[^>]*>[\s\S]*?<\/[^>]+>/g, "");
  cleanedHtml = cleanedHtml.replace(/<div[^>]*style="[^"]*z-index:\s*(?:99999|100000)\b[^"]*position:\s*fixed[^"]*pointer-events:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/g, "");
  cleanedHtml = cleanedHtml.replace(/<div[^>]*style="[^"]*position:\s*fixed[^"]*z-index:\s*(?:99999|100000)\b[^"]*pointer-events:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/g, "");
  return cleanedHtml.replace(/<script[^>]*>[\s\S]*?(?:__pickerInitialized|reportHeight)[\s\S]*?<\/script>/g, "");
}

export function buildPreviewSrcDoc(html: string | null, assetsBasePath?: string | null) {
  if (!html) return html;
  const basePath = assetsBasePath || getAssetsBasePath();
  if (!basePath) return html;
  if (html.includes("<head")) {
    return html.replace(/<head([^>]*)>/, `<head$1><base href="${basePath}" data-mp-injected="true">`);
  }
  return `<base href="${basePath}" data-mp-injected="true">${html}`;
}

export function getCursorClass({
  fallback = "",
  isPanning,
  panActive,
  rectSelectorActive,
}: {
  fallback?: string;
  isPanning?: boolean;
  panActive?: boolean;
  rectSelectorActive?: boolean;
}) {
  if (panActive) return isPanning ? "cursor-grabbing" : "cursor-grab";
  if (rectSelectorActive) return "cursor-crosshair";
  return fallback;
}
