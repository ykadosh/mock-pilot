import type { CropPreview, CropRegion } from "./types";
import {
  forceWebviewHeight,
  waitForLayoutSettle,
  type WebviewSizeSnapshot,
} from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

interface StitchResult { dataUrl: string; width: number; height: number; scale: number }

async function nativeImageToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

interface ChunkData { bitmap: ImageBitmap; y: number; h: number }

async function captureChunks(webview: Electron.WebviewTag, viewportHeight: number, captureMax: number): Promise<ChunkData[]> {
  const chunks: ChunkData[] = [];
  let y = 0;
  while (y < captureMax) {
    const chunkCssHeight = Math.min(viewportHeight, captureMax - y);
    await webview.executeJavaScript(`window.scrollTo(0, ${y})`);
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const image = await webview.capturePage();
    const bitmap = await nativeImageToBitmap(image.toDataURL());
    chunks.push({ bitmap, y, h: chunkCssHeight });
    y += chunkCssHeight;
  }
  return chunks;
}

function stitchChunks(chunks: ChunkData[], viewportWidth: number, targetHeight: number): StitchResult {
  const firstBitmap = chunks[0]?.bitmap;
  const scale = firstBitmap && viewportWidth > 0 ? firstBitmap.width / viewportWidth : 1;
  const canvasWidth = firstBitmap ? firstBitmap.width : Math.round(viewportWidth * scale);
  const canvasHeight = Math.max(1, Math.round(targetHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context for stitching");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  for (const chunk of chunks) {
    const sourceHeight = Math.round(chunk.h * scale);
    const destY = Math.round(chunk.y * scale);
    ctx.drawImage(chunk.bitmap, 0, 0, chunk.bitmap.width, sourceHeight, 0, destY, canvasWidth, sourceHeight);
    chunk.bitmap.close();
  }
  return { dataUrl: canvas.toDataURL("image/png"), width: canvasWidth, height: canvasHeight, scale };
}

// Captures the page from y=0 to targetHeight by scrolling and capturing
// viewport-sized chunks, then stitching them onto a single canvas. This works
// around webview.capturePage()'s clamping to the host BrowserWindow viewport
// (capturePage only returns the currently painted area). Areas beyond the
// page's actual scrollable content are filled white.
async function scrollStitchCapture(webview: Electron.WebviewTag, targetHeight: number, log: Logger): Promise<StitchResult> {
  const viewportWidth = await webview.executeJavaScript("window.innerWidth") as number;
  const viewportHeight = await webview.executeJavaScript("window.innerHeight") as number;
  const docHeight = await webview.executeJavaScript(
    "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)",
  ) as number;
  const captureMax = Math.min(targetHeight, docHeight);
  await log(`Scroll-stitch capture: target=${targetHeight}px doc=${docHeight}px viewport=${viewportWidth}x${viewportHeight}`);
  const originalScrollY = await webview.executeJavaScript("window.scrollY") as number;
  let chunks: ChunkData[] = [];
  try {
    chunks = await captureChunks(webview, viewportHeight, captureMax);
  } finally {
    await webview.executeJavaScript(`window.scrollTo(0, ${originalScrollY})`);
  }
  return stitchChunks(chunks, viewportWidth, targetHeight);
}

export async function capturePreviewForCrop(webview: Electron.WebviewTag, log: Logger): Promise<CropPreview> {
  await log("Taking full-page preview for crop selection...");
  const viewportWidth = await webview.executeJavaScript("window.innerWidth") as number;
  const naturalHeight = await webview.executeJavaScript(
    "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)",
  ) as number;
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await waitForLayoutSettle(webview);
  const stitch = await scrollStitchCapture(webview, naturalHeight, log);
  return { dataUrl: stitch.dataUrl, naturalHeight, viewportWidth };
}

export async function extendPreviewCapture(webview: Electron.WebviewTag, targetHeight: number): Promise<CropPreview> {
  const noopLog: Logger = async () => { /* no-op */ };
  const viewportWidth = await webview.executeJavaScript("window.innerWidth") as number;
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await waitForLayoutSettle(webview);
  const stitch = await scrollStitchCapture(webview, targetHeight, noopLog);
  return { dataUrl: stitch.dataUrl, naturalHeight: targetHeight, viewportWidth };
}

interface ExtensionArgs {
  webview: Electron.WebviewTag;
  preview: CropPreview;
  cropRegion: CropRegion;
  log: Logger;
}

export async function applyCropExtension({ webview, preview, cropRegion, log }: ExtensionArgs): Promise<WebviewSizeSnapshot | null> {
  const targetHeight = Math.max(cropRegion.pageHeight, cropRegion.top + cropRegion.height);
  if (targetHeight <= preview.naturalHeight) return null;
  await log("Extending webview height to " + targetHeight + "px for crop region past page bottom");
  const snapshot = forceWebviewHeight(webview, targetHeight);
  await waitForLayoutSettle(webview);
  await webview.executeJavaScript("window.dispatchEvent(new Event('resize'))");
  await waitForLayoutSettle(webview, 350);
  await webview.executeJavaScript("window.dispatchEvent(new Event('resize'))");
  await waitForLayoutSettle(webview, 350);
  return snapshot;
}

interface ThumbnailArgs {
  webview: Electron.WebviewTag;
  log: Logger;
  cropRegion: CropRegion;
}

export async function cropCapturedThumbnail({ webview, log, cropRegion }: ThumbnailArgs) {
  await log("Taking screenshot...");
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await new Promise(resolve => setTimeout(resolve, 100));
  const pageHeight = Math.max(cropRegion.pageHeight, cropRegion.top + cropRegion.height);
  const stitch = await scrollStitchCapture(webview, pageHeight, log);
  const scale = stitch.scale;
  const cropX = 0;
  const cropY = Math.max(0, Math.round(cropRegion.top * scale));
  const cropWidth = stitch.width;
  const cropHeight = Math.max(1, Math.min(stitch.height - cropY, Math.round(cropRegion.height * scale)));
  await log("Cropping thumbnail to " + cropWidth + "x" + cropHeight + "px (scale=" + scale.toFixed(2) + ")");
  const bitmap = await nativeImageToBitmap(stitch.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to obtain 2D context for thumbnail crop");
  ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
