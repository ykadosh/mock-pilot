import { app, webContents } from "electron";
import fs from "node:fs";
import path from "path";

import {
  collectChildFramesRecursively,
  executeFrameCapture,
  getIframeSrcs,
  matchesKnownIframeHost,
  matchesKnownIframeUrl,
  type CapturedIframe,
  type FrameCapture,
} from "./capture-iframes-utils";

type CaptureIframesResult =
  | { success: true; iframes: CapturedIframe[] }
  | { success: false; error: string };

type AddNestedFrameCapturesOptions = {
  frame: Electron.WebFrameMain;
  captures: FrameCapture[];
  capturedUrls: Set<string>;
  frameLog: string[];
};

type AddOopifFrameCapturesOptions = {
  target: Electron.WebContents;
  knownIframeSrcs: string[];
  captures: FrameCapture[];
  frameLog: string[];
};

function getInProcessFrames(target: Electron.WebContents, frameLog: string[]): Electron.WebFrameMain[] {
  const frames: Electron.WebFrameMain[] = [];
  try {
    collectChildFramesRecursively(target.mainFrame, frames);
  } catch {
    /* empty */
  }
  frameLog.push(`In-process frames: ${frames.length}`);
  for (const frame of frames) {
    frameLog.push(`  webFrameMain: url="${frame.url}" processId=${frame.processId} routingId=${frame.routingId}`);
  }
  return frames;
}

function logAvailableWebContents(frameLog: string[]): void {
  const allWebContents = webContents.getAllWebContents();
  frameLog.push(`Total webContents: ${allWebContents.length}`);
  for (const candidate of allWebContents) {
    frameLog.push(`  wc id=${candidate.id} type=${candidate.getType()} url=${candidate.getURL().substring(0, 100)}`);
  }
}

function addInProcessFrameCaptures(frames: Electron.WebFrameMain[], captures: FrameCapture[]): void {
  for (const frame of frames) {
    if (!frame.url || frame.url === "about:blank" || frame.url.startsWith("data:") || frame.url.startsWith("javascript:")) {
      continue;
    }
    captures.push({ executeJavaScript: (code) => frame.executeJavaScript(code), url: frame.url });
  }
}

async function getKnownIframeSrcs(target: Electron.WebContents, frames: Electron.WebFrameMain[]): Promise<string[]> {
  const srcs = await getIframeSrcs((code) => target.mainFrame.executeJavaScript(code));
  for (const frame of frames) {
    if (!frame.url || frame.url === "about:blank") continue;
    srcs.push(...(await getIframeSrcs((code) => frame.executeJavaScript(code))));
  }
  return srcs;
}

function addNestedFrameCaptures({ frame, captures, capturedUrls, frameLog }: AddNestedFrameCapturesOptions): void {
  const nestedFrames: Electron.WebFrameMain[] = [];
  collectChildFramesRecursively(frame, nestedFrames);
  for (const nestedFrame of nestedFrames) {
    if (!nestedFrame.url || nestedFrame.url === "about:blank" || capturedUrls.has(nestedFrame.url)) continue;
    captures.push({ executeJavaScript: (code) => nestedFrame.executeJavaScript(code), url: nestedFrame.url });
    capturedUrls.add(nestedFrame.url);
    frameLog.push(`Found nested frame in OOPIF: ${nestedFrame.url}`);
  }
}

function addOopifFrameCaptures({ target, knownIframeSrcs, captures, frameLog }: AddOopifFrameCapturesOptions): void {
  const capturedUrls = new Set(captures.map((capture) => capture.url));
  capturedUrls.add(target.getURL());

  for (const candidate of webContents.getAllWebContents()) {
    const otherUrl = candidate.getURL();
    if (candidate.id === target.id || !otherUrl || otherUrl === "about:blank" || capturedUrls.has(otherUrl)) continue;
    const isIframe = matchesKnownIframeUrl(otherUrl, knownIframeSrcs) || matchesKnownIframeHost(candidate, otherUrl, knownIframeSrcs);
    if (!isIframe) continue;

    frameLog.push(`Found OOPIF webContents: id=${candidate.id} url=${otherUrl}`);
    captures.push({ executeJavaScript: (code) => candidate.executeJavaScript(code), url: otherUrl });
    capturedUrls.add(otherUrl);
    addNestedFrameCaptures({ frame: candidate.mainFrame, captures, capturedUrls, frameLog });
  }
}

async function getFramesToCapture(
  target: Electron.WebContents,
  inProcessFrames: Electron.WebFrameMain[],
  frameLog: string[]
): Promise<FrameCapture[]> {
  const captures: FrameCapture[] = [];
  logAvailableWebContents(frameLog);
  addInProcessFrameCaptures(inProcessFrames, captures);
  const knownIframeSrcs = await getKnownIframeSrcs(target, inProcessFrames);
  frameLog.push(`Known iframe srcs: ${knownIframeSrcs.map((src) => src.substring(0, 80)).join(", ")}`);
  addOopifFrameCaptures({ target, knownIframeSrcs, captures, frameLog });
  frameLog.push(`Frames to capture: ${captures.length}`);
  return captures;
}

async function captureFrame(frame: FrameCapture, frameLog: string[]): Promise<CapturedIframe | null> {
  try {
    const childIframeSrcs = await getIframeSrcs(frame.executeJavaScript);
    frameLog.push(`Frame ${frame.url.substring(0, 80)} has ${childIframeSrcs.length} child iframe(s): ${childIframeSrcs.map((src) => src.substring(0, 80)).join(", ")}`);
    const html = await executeFrameCapture(frame);
    const remainingIframes = (html.match(/<iframe /g) || []).length;
    frameLog.push(`Captured: ${frame.url} (${html.length} chars, ${remainingIframes} remaining iframes)`);
    return { url: frame.url, html, childIframeSrcs };
  } catch (error) {
    frameLog.push(`Failed ${frame.url}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function captureFrames(captures: FrameCapture[], frameLog: string[]): Promise<CapturedIframe[]> {
  const results: CapturedIframe[] = [];
  for (const frame of [...captures].reverse()) {
    const capture = await captureFrame(frame, frameLog);
    if (capture) results.push(capture);
  }
  return results;
}

function writeFrameDebugLog(frameLog: string[]): void {
  const debugLogPath = path.join(app.getPath("userData"), "mock-pilot-frame-debug.log");
  fs.writeFileSync(debugLogPath, frameLog.join("\n"));
}

export async function handleCaptureIframes(
  _event: Electron.IpcMainInvokeEvent,
  webContentsId: number
): Promise<CaptureIframesResult> {
  try {
    const target = webContents.fromId(webContentsId);
    if (!target) return { success: false, error: "WebContents not found" };

    const frameLog: string[] = [];
    const inProcessFrames = getInProcessFrames(target, frameLog);
    const framesToCapture = await getFramesToCapture(target, inProcessFrames, frameLog);
    const iframes = framesToCapture.length === 0 ? [] : await captureFrames(framesToCapture, frameLog);

    writeFrameDebugLog(frameLog);
    return { success: true, iframes };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
