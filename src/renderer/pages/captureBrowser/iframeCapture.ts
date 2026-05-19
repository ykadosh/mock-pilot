import { buildIframeFallbackScript, buildInlineCapturedFramesScript, IFRAME_DATA_SCRIPT } from "./scripts/iframeScripts";

interface IframeData { index: number; src: string; }
interface CapturedFrame { childIframeSrcs: string[]; html: string; url: string; }
interface CaptureFramesResult { error?: string; iframes?: CapturedFrame[]; success: boolean; }

export async function captureAndInlineIframes(webview: Electron.WebviewTag, log: (...args: unknown[]) => Promise<void>, advanceStep: (stepKey: string) => void) {
  advanceStep("stylesheets");
  await log("Checking for iframes to inline...");
  const iframeData = await fetchIframeData(webview);
  if (!iframeData.length) return void (await log("No iframes found"));
  await log(`Found ${iframeData.length} iframe(s) to capture`);
  const capturedFrames = await captureWebviewFrames(webview);
  if (!capturedFrames.success || !capturedFrames.iframes?.length) return handleIframeFallback({ webview, iframeData, error: capturedFrames.error, log });
  await log(`Captured ${capturedFrames.iframes.length} frame(s) via webFrameMain`);
  await inlineCapturedFrames(webview, capturedFrames.iframes);
  await log("Iframe replacement complete");
  await log("Iframe processing complete");
}

async function fetchIframeData(webview: Electron.WebviewTag) {
  return webview.executeJavaScript(IFRAME_DATA_SCRIPT) as Promise<IframeData[]>;
}

async function captureWebviewFrames(webview: Electron.WebviewTag) {
  const webContentsId = (webview as Electron.WebviewTag & { getWebContentsId?: () => number }).getWebContentsId?.();
  return webContentsId ? window.api.captureWebviewIframes(webContentsId) as Promise<CaptureFramesResult> : { success: false, error: "Could not get webContentsId" };
}

async function inlineCapturedFrames(webview: Electron.WebviewTag, frames: CapturedFrame[]) {
  const capturedMap = JSON.stringify(buildFrameMap(frames));
  await webview.executeJavaScript(buildInlineCapturedFramesScript(capturedMap));
}

function buildFrameMap(frames: CapturedFrame[]) {
  const frameMap: Record<string, string> = {};
  frames.forEach(frame => addFrameMappings(frameMap, frame));
  frames.forEach(frame => addChildFrameMappings(frameMap, frames, frame));
  return frameMap;
}

function addFrameMappings(frameMap: Record<string, string>, frame: CapturedFrame) {
  frameMap[frame.url] = frame.html;
  frameMap[normalizeFrameUrl(frame.url)] = frame.html;
}

function addChildFrameMappings(frameMap: Record<string, string>, frames: CapturedFrame[], frame: CapturedFrame) {
  frame.childIframeSrcs?.forEach(childSrc => {
    if (!childSrc) return;
    const childFrame = findMatchingChildFrame(frames, frame.url, childSrc);
    if (!childFrame) return;
    frameMap[childSrc] = childFrame.html;
    frameMap[normalizeFrameUrl(childSrc)] = childFrame.html;
  });
}

function findMatchingChildFrame(frames: CapturedFrame[], parentUrl: string, childSrc: string) {
  return frames.find(frame => frame.url !== parentUrl && (urlsMatch(frame.url, childSrc) || pathsMatch(frame.url, childSrc)));
}

function urlsMatch(sourceUrl: string, targetUrl: string) {
  const normalizedSource = normalizeFrameUrl(sourceUrl);
  const normalizedTarget = normalizeFrameUrl(targetUrl);
  return normalizedSource === normalizedTarget || sourceUrl.includes(targetUrl) || targetUrl.includes(sourceUrl);
}

function pathsMatch(sourceUrl: string, targetUrl: string) {
  try {
    const sourcePath = new URL(sourceUrl).pathname.replace(/\/+$/, "");
    const targetPath = new URL(targetUrl).pathname.replace(/\/+$/, "");
    return sourcePath === targetPath && sourcePath.length > 1;
  } catch {
    return false;
  }
}

function normalizeFrameUrl(url: string) {
  return url.replace(/[#?].*$/, "").replace(/\/+$/, "");
}

interface IframeFallbackOptions {
  webview: Electron.WebviewTag;
  iframeData: IframeData[];
  error: string | undefined;
  log: (...args: unknown[]) => Promise<void>;
}

async function handleIframeFallback({ webview, iframeData, error, log }: IframeFallbackOptions) {
  await log("Frame capture failed or returned empty: " + (error || "no frames"));
  for (const { index } of [...iframeData].reverse()) await webview.executeJavaScript(buildIframeFallbackScript(index));
  await log("Iframe processing complete");
}
