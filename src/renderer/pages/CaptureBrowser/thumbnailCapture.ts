import type { CropRegion } from "./types";

type Logger = (...args: unknown[]) => Promise<void>;

// Project cards on the Projects page render the thumbnail at roughly 500px
// wide and only show the top portion of the site. Capturing the full crop
// region at device-pixel-ratio resolution produced images many times larger
// than will ever be displayed, so we cap the output here.
const THUMBNAIL_MAX_WIDTH = 1000;
const THUMBNAIL_JPEG_QUALITY = 0.85;
const SCROLL_SETTLE_MS = 100;

interface ThumbnailArgs {
  webview: Electron.WebviewTag;
  log: Logger;
  cropRegion: CropRegion;
}

async function nativeImageToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

interface SourceMetrics {
  bitmap: ImageBitmap;
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
}

async function captureSource(webview: Electron.WebviewTag, cropRegion: CropRegion): Promise<SourceMetrics> {
  const cropTop = Math.max(0, Math.round(cropRegion.top));
  await webview.executeJavaScript(`window.scrollTo(0, ${cropTop})`);
  await new Promise(resolve => setTimeout(resolve, SCROLL_SETTLE_MS));

  const hostRect = webview.getBoundingClientRect();
  const viewportCssWidth = Math.max(1, Math.round(hostRect.width));
  const viewportCssHeight = Math.max(1, Math.round(hostRect.height));

  const image = await webview.capturePage();
  const bitmap = await nativeImageToBitmap(image.toDataURL());

  // Captured bitmap is in device pixels; derive the scale relative to CSS
  // pixels so we can clamp the crop height correctly.
  const scale = bitmap.width / viewportCssWidth;
  const visibleCssHeight = Math.min(viewportCssHeight, Math.max(1, Math.round(cropRegion.height)));
  const sourceHeight = Math.max(1, Math.min(bitmap.height, Math.round(visibleCssHeight * scale)));
  return { bitmap, sourceWidth: bitmap.width, sourceHeight, scale };
}

// Captures the project preview shown on the Projects page.
//
// Earlier implementations did a full scroll+stitch of the entire crop region
// and stored a PNG base64 data URL. Both were wasteful because the card only
// displays the top portion of the site at ~500px wide. We now capture a
// single viewport screenshot, downscale it to retina-safe dimensions, and
// return a JPEG data URL.
export async function cropCapturedThumbnail({ webview, log, cropRegion }: ThumbnailArgs) {
  await log("Taking thumbnail screenshot (viewport only)...");
  const { bitmap, sourceWidth, sourceHeight, scale } = await captureSource(webview, cropRegion);

  const downscale = Math.min(1, THUMBNAIL_MAX_WIDTH / sourceWidth);
  const outWidth = Math.max(1, Math.round(sourceWidth * downscale));
  const outHeight = Math.max(1, Math.round(sourceHeight * downscale));

  await log("Thumbnail " + outWidth + "x" + outHeight + "px (source " + sourceWidth + "x" + sourceHeight + ", scale=" + scale.toFixed(2) + ")");

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to obtain 2D context for thumbnail crop");
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(bitmap, 0, 0, sourceWidth, sourceHeight, 0, 0, outWidth, outHeight);
  bitmap.close();

  // JPEG keeps storage small and avoids the ~33% base64 bloat that PNG had.
  return canvas.toDataURL("image/jpeg", THUMBNAIL_JPEG_QUALITY);
}
