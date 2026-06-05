import type { CropPreview, CropRegion } from "./types";
import {
  forceWebviewHeight,
  restoreWebviewHeight,
  waitForLayoutSettle,
  type WebviewSizeSnapshot,
} from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

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
    const image = await webview.capturePage();
    return { dataUrl: image.toDataURL(), naturalHeight, viewportWidth };
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
    const image = await webview.capturePage();
    return { dataUrl: image.toDataURL(), naturalHeight: targetHeight, viewportWidth };
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
  const cropBottom = cropRegion.top + cropRegion.height;
  if (cropBottom <= preview.naturalHeight) return null;
  await log("Extending webview height to " + cropBottom + "px for crop region past page bottom");
  const snapshot = forceWebviewHeight(webview, cropBottom);
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
  const image = await webview.capturePage();
  const size = image.getSize();
  const scale = viewportWidth > 0 ? size.width / viewportWidth : 1;
  const cropX = 0;
  const cropY = Math.max(0, Math.round(cropRegion.top * scale));
  const cropWidth = size.width;
  const cropHeight = Math.max(1, Math.min(size.height - cropY, Math.round(cropRegion.height * scale)));
  await log("Cropping thumbnail to " + cropWidth + "x" + cropHeight + "px (scale=" + scale.toFixed(2) + ")");
  return image.crop({ x: cropX, y: cropY, width: cropWidth, height: cropHeight }).toDataURL();
}
