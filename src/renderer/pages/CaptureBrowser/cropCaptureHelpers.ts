import { scrollStitchCapture } from "./scrollStitchCapture";
import type { CropPreview, CropRegion } from "./types";
import {
  forceWebviewHeight,
  waitForLayoutSettle,
  type WebviewSizeSnapshot,
} from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

const PREVIEW_MAX_DIM = 1200;
const PREVIEW_CHUNK_WAIT_MS = 50;

export interface PreviewExtensionResult {
  preview: CropPreview;
  snapshot: WebviewSizeSnapshot;
}

async function nativeImageToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

async function downscaleToBlobUrl(dataUrl: string, maxDim: number): Promise<string> {
  const bitmap = await nativeImageToBitmap(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to obtain 2D context for preview downscale");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const outBlob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!outBlob) throw new Error("Failed to encode preview JPEG");
  return URL.createObjectURL(outBlob);
}

interface Chunk { bitmap: ImageBitmap; y: number; h: number }

async function fastChunkCapture(webview: Electron.WebviewTag, chunkCssHeight: number, targetHeight: number): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  const numChunks = Math.ceil(targetHeight / chunkCssHeight);
  for (let i = 0; i < numChunks; i++) {
    const offset = i * chunkCssHeight;
    await webview.executeJavaScript(`(() => { const el = document.documentElement; el.style.transform = 'translateY(${-offset}px)'; el.style.transformOrigin = 'top left'; })()`);
    await new Promise<void>((r) => setTimeout(r, PREVIEW_CHUNK_WAIT_MS));
    const image = await webview.capturePage();
    const bitmap = await nativeImageToBitmap(image.toDataURL());
    chunks.push({ bitmap, y: offset, h: Math.min(chunkCssHeight, targetHeight - offset) });
  }
  try { await webview.executeJavaScript("(() => { const el = document.documentElement; el.style.transform = ''; el.style.transformOrigin = ''; })()"); } catch { /* gone */ }
  return chunks;
}

function stitchToDataUrl(chunks: Chunk[], viewportWidth: number, targetHeight: number) {
  const first = chunks[0]?.bitmap;
  const scale = first && viewportWidth > 0 ? first.width / viewportWidth : 1;
  const w = first ? first.width : Math.round(viewportWidth * scale);
  const h = Math.max(1, Math.round(targetHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context for preview stitch");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  for (const c of chunks) {
    const sH = Math.round(c.h * scale);
    const dY = Math.round(c.y * scale);
    ctx.drawImage(c.bitmap, 0, 0, c.bitmap.width, sH, 0, dY, w, sH);
    c.bitmap.close();
  }
  return canvas.toDataURL("image/png");
}

async function previewStitchCapture(webview: Electron.WebviewTag, targetHeight: number, prevSnapshot: WebviewSizeSnapshot | null) {
  const hostRect = webview.getBoundingClientRect();
  const chunkCssHeight = Math.max(1, Math.round(hostRect.height));
  const currentHeight = parseFloat(webview.style.height) || hostRect.height;
  let snapshot = prevSnapshot;
  const needsResize = !snapshot || targetHeight !== currentHeight;
  if (!snapshot) snapshot = forceWebviewHeight(webview, targetHeight);
  else if (targetHeight !== currentHeight) forceWebviewHeight(webview, targetHeight);
  if (needsResize) {
    await waitForLayoutSettle(webview, 100);
    await webview.executeJavaScript("window.dispatchEvent(new Event('resize'))");
    await waitForLayoutSettle(webview, 80);
  }
  const viewportWidth = Math.round(hostRect.width);
  const chunks = await fastChunkCapture(webview, chunkCssHeight, targetHeight);
  return { dataUrl: stitchToDataUrl(chunks, viewportWidth, targetHeight), snapshot, viewportWidth };
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
  const dataUrl = await downscaleToBlobUrl(stitch.dataUrl, PREVIEW_MAX_DIM);
  return { dataUrl, naturalHeight, viewportWidth };
}

export async function extendPreviewCapture(webview: Electron.WebviewTag, targetHeight: number, prevSnapshot: WebviewSizeSnapshot | null): Promise<PreviewExtensionResult> {
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  const { dataUrl: stitchDataUrl, snapshot, viewportWidth } = await previewStitchCapture(webview, targetHeight, prevSnapshot);
  const dataUrl = await downscaleToBlobUrl(stitchDataUrl, PREVIEW_MAX_DIM);
  return { preview: { dataUrl, naturalHeight: targetHeight, viewportWidth }, snapshot };
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

