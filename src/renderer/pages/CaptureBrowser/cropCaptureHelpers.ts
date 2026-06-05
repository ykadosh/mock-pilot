import { scrollStitchCapture } from "./scrollStitchCapture";
import type { CropPreview, CropRegion } from "./types";
import {
  forceWebviewHeight,
  waitForLayoutSettle,
  type WebviewSizeSnapshot,
} from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

async function nativeImageToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
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
