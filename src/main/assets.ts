import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

import { projectsDir } from "./projects";

export function extractAndSaveAssets(id: string, html: string): string {
  const assetsDir = path.join(projectsDir, `${id}.assets`);

  // Map of data URI → relative path (for deduplication)
  const assetMap = new Map<string, string>();

  function saveAsset(dataUri: string): string {
    // Check dedup cache
    const cached = assetMap.get(dataUri);
    if (cached) return cached;

    // Parse the data URI: data:[<mediatype>][;base64],<data>
    const match = dataUri.match(/^data:([^;,]+)(?:;base64)?,(.*)$/s);
    if (!match) return dataUri; // Can't parse, leave as-is

    const mimeType = match[1];
    const base64Data = match[2];

    // Determine file extension from MIME type
    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/bmp": "bmp",
      "image/x-icon": "ico",
      "image/vnd.microsoft.icon": "ico",
      "font/woff": "woff",
      "font/woff2": "woff2",
      "application/font-woff": "woff",
      "application/font-woff2": "woff2",
      "font/ttf": "ttf",
      "font/otf": "otf",
      "application/x-font-ttf": "ttf",
      "application/x-font-opentype": "otf",
      "font/opentype": "otf",
      "application/vnd.ms-fontobject": "eot",
    };
    const ext = extMap[mimeType] || mimeType.split("/")[1] || "bin";

    // Compute content hash for deduplication and filename
    const hash = crypto.createHash("sha256").update(base64Data).digest("hex").slice(0, 12);
    const filename = `${hash}.${ext}`;
    const relativePath = `${id}.assets/${filename}`;

    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Write the file (skip if already exists — same content hash)
    const filePath = path.join(assetsDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, base64Data, "base64");
    }

    assetMap.set(dataUri, relativePath);
    return relativePath;
  }

  // Extract base64 images from img src attributes
  // Matches: src="data:image/...;base64,..."
  html = html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*")([^"]*data:[^"]+;base64,[^"]+)(")/gi,
    (_match, prefix, dataUri, suffix) => {
      const relativePath = saveAsset(dataUri);
      return `${prefix}${relativePath}${suffix}`;
    }
  );

  // Remove srcset attributes from img tags that now use local asset paths
  // (srcset would point to stale external URLs and override the local src)
  html = html.replace(
    /<img\b[^>]*>/gi,
    (imgTag) => {
      if (/\bsrc\s*=\s*"[^"]*\.assets\//.test(imgTag) && /\bsrcset\s*=/.test(imgTag)) {
        return imgTag.replace(/\s*srcset\s*=\s*"[^"]*"/gi, "");
      }
      return imgTag;
    }
  );

  // Extract base64 data URIs from CSS url() — fonts and background images
  // Matches: url("data:...;base64,...") or url(data:...;base64,...)
  html = html.replace(
    /url\(\s*["']?(data:[^"')]+;base64,[^"')]+)["']?\s*\)/gi,
    (_match, dataUri) => {
      const relativePath = saveAsset(dataUri);
      return `url("${relativePath}")`;
    }
  );

  // Extract base64 data URIs from srcset attributes (inside <source> and <img> tags)
  html = html.replace(
    /(\bsrcset\s*=\s*")((?:[^"]*data:[^"]+;base64,[^"]+)+)(")/gi,
    (_match, prefix, srcsetValue, suffix) => {
      const newSrcset = srcsetValue.replace(
        /(data:[^,]+;base64,[^\s,"]+)/g,
        (dataUri: string) => saveAsset(dataUri)
      );
      return `${prefix}${newSrcset}${suffix}`;
    }
  );

  return html;
}

