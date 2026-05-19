import { app, webContents } from "electron";
import fs from "node:fs";
import path from "path";

type FrameCapture = {
  executeJavaScript: (code: string) => Promise<unknown>;
  url: string;
};

type CapturedIframe = {
  url: string;
  html: string;
  childIframeSrcs: string[];
};

type CaptureIframesResult =
  | { success: true; iframes: CapturedIframe[] }
  | { success: false; error: string };

const IFRAME_SRCS_SCRIPT = String.raw`(function(){var srcs=[];document.querySelectorAll("iframe").forEach(function(frame){var src=frame.src||frame.getAttribute("src")||"";if(src)srcs.push(src);});return srcs;})()`;

const FRAME_CAPTURE_SCRIPT = String.raw`(async function(){var stylesheets=document.querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<stylesheets.length;i++){try{var href=stylesheets[i].href;var controller=new AbortController();var timeoutId=setTimeout(function(){controller.abort();},5000);var response=await fetch(href,{signal:controller.signal});clearTimeout(timeoutId);var css=await response.text();var style=document.createElement("style");style.textContent=css;stylesheets[i].replaceWith(style);}catch(error){}}var images=document.querySelectorAll("img");for(var j=0;j<images.length;j++){try{var img=images[j];if(!img.complete||img.naturalWidth===0)continue;var canvas=document.createElement("canvas");canvas.width=img.naturalWidth||img.width||300;canvas.height=img.naturalHeight||img.height||200;var context=canvas.getContext("2d");if(context){context.drawImage(img,0,0);img.src=canvas.toDataURL("image/png");img.removeAttribute("srcset");}}catch(error){}}document.querySelectorAll("script").forEach(function(script){script.remove();});document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="modulepreload"], link[rel="icon"]').forEach(function(link){link.remove();});document.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(element){element.remove();});document.querySelectorAll('div, section, aside, p, span').forEach(function(element){if(element.textContent&&element.textContent.indexOf('Do not enter passwords')>=0&&element.textContent.indexOf('CodePen')>=0){element.remove();}});document.querySelectorAll("style").forEach(function(style){try{var sheet=style.sheet;if(!sheet||!sheet.cssRules||sheet.cssRules.length===0)return;var rules=[];for(var k=0;k<sheet.cssRules.length;k++){rules.push(sheet.cssRules[k].cssText);}var serialized=rules.join("\n");if(serialized!==(style.textContent||"").trim())style.textContent=serialized;}catch(error){}});return document.documentElement.outerHTML;})()`;

function collectChildFramesRecursively(frame: Electron.WebFrameMain, frames: Electron.WebFrameMain[]): void {
  for (const child of frame.frames) {
    frames.push(child);
    collectChildFramesRecursively(child, frames);
  }
}

function getInProcessFrames(target: Electron.WebContents, frameLog: string[]): Electron.WebFrameMain[] {
  const frames: Electron.WebFrameMain[] = [];
  try {
    collectChildFramesRecursively(target.mainFrame, frames);
  } catch {}
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

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

async function getIframeSrcs(executeJavaScript: (code: string) => Promise<unknown>): Promise<string[]> {
  try {
    return normalizeStringArray(await executeJavaScript(IFRAME_SRCS_SCRIPT));
  } catch {
    return [];
  }
}

async function getKnownIframeSrcs(
  target: Electron.WebContents,
  frames: Electron.WebFrameMain[]
): Promise<string[]> {
  const srcs = await getIframeSrcs((code) => target.mainFrame.executeJavaScript(code));
  for (const frame of frames) {
    if (!frame.url || frame.url === "about:blank") continue;
    srcs.push(...(await getIframeSrcs((code) => frame.executeJavaScript(code))));
  }
  return srcs;
}

function matchesKnownIframeUrl(otherUrl: string, knownIframeSrcs: string[]): boolean {
  for (const src of knownIframeSrcs) {
    try {
      const sourceUrl = new URL(src);
      const targetUrl = new URL(otherUrl);
      if (src === otherUrl || sourceUrl.pathname === targetUrl.pathname) return true;
    } catch {}
  }
  return false;
}

function matchesKnownIframeHost(candidate: Electron.WebContents, otherUrl: string, knownIframeSrcs: string[]): boolean {
  if (candidate.getType() !== "webview" && candidate.getType() !== "browserView") return false;
  try {
    const host = new URL(otherUrl).hostname;
    return knownIframeSrcs.some((src) => {
      try {
        return new URL(src).hostname === host;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function addNestedFrameCaptures(
  frame: Electron.WebFrameMain,
  captures: FrameCapture[],
  capturedUrls: Set<string>,
  frameLog: string[]
): void {
  const nestedFrames: Electron.WebFrameMain[] = [];
  collectChildFramesRecursively(frame, nestedFrames);
  for (const nestedFrame of nestedFrames) {
    if (!nestedFrame.url || nestedFrame.url === "about:blank" || capturedUrls.has(nestedFrame.url)) continue;
    captures.push({ executeJavaScript: (code) => nestedFrame.executeJavaScript(code), url: nestedFrame.url });
    capturedUrls.add(nestedFrame.url);
    frameLog.push(`Found nested frame in OOPIF: ${nestedFrame.url}`);
  }
}

function addOopifFrameCaptures(
  target: Electron.WebContents,
  knownIframeSrcs: string[],
  captures: FrameCapture[],
  frameLog: string[]
): void {
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
    addNestedFrameCaptures(candidate.mainFrame, captures, capturedUrls, frameLog);
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
  addOopifFrameCaptures(target, knownIframeSrcs, captures, frameLog);
  frameLog.push(`Frames to capture: ${captures.length}`);
  return captures;
}

async function executeFrameCapture(frame: FrameCapture): Promise<string> {
  const result = await frame.executeJavaScript(FRAME_CAPTURE_SCRIPT);
  return typeof result === "string" ? result : "";
}

async function captureFrame(frame: FrameCapture, frameLog: string[]): Promise<CapturedIframe | null> {
  try {
    const childIframeSrcs = await getIframeSrcs(frame.executeJavaScript);
    frameLog.push(
      `Frame ${frame.url.substring(0, 80)} has ${childIframeSrcs.length} child iframe(s): ${childIframeSrcs.map((src) => src.substring(0, 80)).join(", ")}`
    );
    console.log(`[Capture] Capturing frame: ${frame.url.substring(0, 80)}`);
    const html = await executeFrameCapture(frame);
    const remainingIframes = (html.match(/<iframe /g) || []).length;
    frameLog.push(`Captured: ${frame.url} (${html.length} chars, ${remainingIframes} remaining iframes)`);
    console.log(`[Capture] Frame captured: ${html.length} chars`);
    return { url: frame.url, html, childIframeSrcs };
  } catch (error) {
    frameLog.push(`Failed ${frame.url}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[Capture] Failed to capture frame:`, error instanceof Error ? error.message : error);
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
