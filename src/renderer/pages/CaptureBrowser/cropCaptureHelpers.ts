import type { CropPreview, CropRegion } from "./types";
import {
  forceWebviewHeight,
  restoreWebviewHeight,
  waitForLayoutSettle,
  type WebviewSizeSnapshot,
} from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

async function captureFullPage(webview: Electron.WebviewTag, width: number, height: number): Promise<string> {
  const webContentsId = webview.getWebContentsId();
  const result = await window.api.captureWebviewFullPage({ webContentsId, width, height });
  if (!result.success || !result.dataUrl) throw new Error(result.error || "Full-page capture failed");
  return result.dataUrl;
}

export async function capturePreviewForCrop(webview: Electron.WebviewTag, log: Logger): Promise<CropPreview> {
  await log("Taking full-page preview for crop selection...");
  const viewportWidth = await webview.executeJavaScript("window.innerWidth") as number;
  const naturalHeight = await webview.executeJavaScript(
    "Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0)",
  ) as number;
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  const snapshot = forceWebviewHeight(webview, naturalHeight);
  try {
    await waitForLayoutSettle(webview);
    const dataUrl = await captureFullPage(webview, viewportWidth, naturalHeight);
    return { dataUrl, naturalHeight, viewportWidth };
  } finally {
    restoreWebviewHeight(webview, snapshot);
  }
}

export async function extendPreviewCapture(webview: Electron.WebviewTag, targetHeight: number): Promise<CropPreview> {
  const viewportWidth = await webview.executeJavaScript("window.innerWidth") as number;
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  const snapshot = forceWebviewHeight(webview, targetHeight);
  try {
    await waitForLayoutSettle(webview);
    await webview.executeJavaScript("window.dispatchEvent(new Event('resize'))");
    await waitForLayoutSettle(webview, 350);
    const dataUrl = await captureFullPage(webview, viewportWidth, targetHeight);
    return { dataUrl, naturalHeight: targetHeight, viewportWidth };
  } finally {
    restoreWebviewHeight(webview, snapshot);
  }
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
  // Nudge JS-driven layouts that listen to resize events but don't respond to the
  // initial style change alone. Run twice with a settle between to flush debounced
  // handlers (common in modern frameworks).
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
  viewportWidth: number;
}

export async function cropCapturedThumbnail({ webview, log, cropRegion, viewportWidth }: ThumbnailArgs) {
  await log("Taking screenshot...");
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await new Promise(resolve => setTimeout(resolve, 100));
  const pageHeight = Math.max(cropRegion.pageHeight, cropRegion.top + cropRegion.height);
  const dataUrl = await captureFullPage(webview, viewportWidth, pageHeight);
  // Decode to ImageBitmap so we can read pixel dimensions and crop precisely.
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const scale = viewportWidth > 0 ? bitmap.width / viewportWidth : 1;
  const cropX = 0;
  const cropY = Math.max(0, Math.round(cropRegion.top * scale));
  const cropWidth = bitmap.width;
  const cropHeight = Math.max(1, Math.min(bitmap.height - cropY, Math.round(cropRegion.height * scale)));
  await log("Cropping thumbnail to " + cropWidth + "x" + cropHeight + "px (scale=" + scale.toFixed(2) + ")");
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to obtain 2D context for thumbnail crop");
  ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
