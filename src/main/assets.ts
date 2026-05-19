import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { projectsDir } from "./projects";

const ASSET_EXTENSIONS: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif",
  "image/svg+xml": "svg", "image/webp": "webp", "image/avif": "avif", "image/bmp": "bmp",
  "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "font/woff": "woff", "font/woff2": "woff2",
  "application/font-woff": "woff", "application/font-woff2": "woff2", "font/ttf": "ttf",
  "font/otf": "otf", "application/x-font-ttf": "ttf", "application/x-font-opentype": "otf",
  "font/opentype": "otf", "application/vnd.ms-fontobject": "eot",
};

function parseDataUri(dataUri: string): { mimeType: string; base64Data: string } | null {
  const match = dataUri.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
  return match ? { mimeType: match[1], base64Data: match[2] } : null;
}

function getExtensionFromMime(mimeType: string): string {
  return ASSET_EXTENSIONS[mimeType] || mimeType.split("/")[1] || "bin";
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createAssetSaver(id: string, assetsDir: string): (dataUri: string) => string {
  const assetMap = new Map<string, string>();
  return function saveAsset(dataUri: string): string {
    const cached = assetMap.get(dataUri);
    if (cached) return cached;
    const parsed = parseDataUri(dataUri);
    if (!parsed) return dataUri;

    const ext = getExtensionFromMime(parsed.mimeType);
    const hash = crypto.createHash("sha256").update(parsed.base64Data).digest("hex").slice(0, 12);
    const filename = `${hash}.${ext}`;
    const relativePath = `${id}.assets/${filename}`;
    const filePath = path.join(assetsDir, filename);

    ensureDir(assetsDir);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, parsed.base64Data, "base64");
    assetMap.set(dataUri, relativePath);
    return relativePath;
  };
}

function replaceImgDataUris(html: string, saveAsset: (dataUri: string) => string): string {
  return html.replace(/(<img\b[^>]*\bsrc\s*=\s*")([^"]*data:[^"]+;base64,[^"]+)(")/gi,
    (...parts) => {
      const [, prefix, dataUri, suffix] = parts as [string, string, string, string];
      return `${prefix}${saveAsset(dataUri)}${suffix}`;
    });
}

function removeLocalImgSrcsets(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (imgTag) =>
    /\bsrc\s*=\s*"[^"]*\.assets\//.test(imgTag) && /\bsrcset\s*=/.test(imgTag)
      ? imgTag.replace(/\s*srcset\s*=\s*"[^"]*"/gi, "")
      : imgTag);
}

function replaceCssDataUris(html: string, saveAsset: (dataUri: string) => string): string {
  return html.replace(/url\(\s*["']?(data:[^"')]+;base64,[^"')]+)["']?\s*\)/gi,
    (_match, dataUri) => `url("${saveAsset(dataUri)}")`);
}

function replaceSrcsetDataUris(html: string, saveAsset: (dataUri: string) => string): string {
  return html.replace(/(\bsrcset\s*=\s*")((?:[^"]*data:[^"]+;base64,[^"]+)+)(")/gi,
    (...parts) => {
      const [, prefix, srcsetValue, suffix] = parts as [string, string, string, string];
      return `${prefix}${srcsetValue.replace(/(data:[^,]+;base64,[^\s,"]+)/g, saveAsset)}${suffix}`;
    });
}

export function extractAndSaveAssets(id: string, html: string): string {
  const assetsDir = path.join(projectsDir, `${id}.assets`);
  const saveAsset = createAssetSaver(id, assetsDir);

  html = replaceImgDataUris(html, saveAsset);
  html = removeLocalImgSrcsets(html);
  html = replaceCssDataUris(html, saveAsset);
  return replaceSrcsetDataUris(html, saveAsset);
}

