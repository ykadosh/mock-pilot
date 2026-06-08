import fs from "fs";
import path from "path";

import { getProjectDir } from "../projects";

function projectFilePath(id: string, filename: string) {
  return path.join(getProjectDir(id), filename);
}

// Parse a `data:<mime>;base64,<payload>` URL into the raw bytes plus the
// extension we should persist it as. Falls back to a JPEG extension because
// that's what the renderer now produces for project thumbnails.
export function decodeImageDataUrl(dataUrl: string): {
  buffer: Buffer;
  extension: "jpg" | "png" | "webp";
} {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    // Legacy callers passed bare base64 PNG payloads (the only historical
    // format), so fall back to PNG to preserve that contract.
    return {
      buffer: Buffer.from(dataUrl.replace(/^data:[^,]+,/, ""), "base64"),
      extension: "png",
    };
  }
  const mime = match[1].toLowerCase();
  let extension: "jpg" | "png" | "webp" = "jpg";
  if (mime === "png") extension = "png";
  else if (mime === "webp") extension = "webp";
  return { buffer: Buffer.from(match[2], "base64"), extension };
}

// Persists a project thumbnail to disk. Removes any pre-existing thumbnail in
// other supported formats so we never serve a stale legacy `thumbnail.png`
// alongside a freshly generated `thumbnail.jpg`.
export function writeProjectThumbnail(id: string, dataUrl: string): "jpg" | "png" | "webp" {
  const { buffer, extension } = decodeImageDataUrl(dataUrl);
  for (const ext of ["png", "jpg", "jpeg", "webp"] as const) {
    const stalePath = projectFilePath(id, `thumbnail.${ext}`);
    if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
  }
  fs.writeFileSync(projectFilePath(id, `thumbnail.${extension}`), buffer);
  return extension;
}

// Returns the on-disk path of the project's thumbnail, in the preferred
// format order, or `null` if none exist.
export function findProjectThumbnail(id: string): { path: string; extension: string } | null {
  for (const ext of ["jpg", "webp", "png"]) {
    const filePath = projectFilePath(id, `thumbnail.${ext}`);
    if (fs.existsSync(filePath)) return { path: filePath, extension: ext };
  }
  return null;
}
