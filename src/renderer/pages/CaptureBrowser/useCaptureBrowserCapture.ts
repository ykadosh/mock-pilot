import { useCallback } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { CaptureStep } from "../../components/CaptureProgressModal";
import { setCapturedHtml } from "../../lib/store";
import { captureAndInlineIframes } from "./iframeCapture";
import { extractComponents } from "./extractComponents";
import { createCaptureHtmlScript } from "./scripts/captureHtmlScript";
import { EXTRACT_ASSETS_SCRIPT } from "./scripts/extractAssetsScript";
import { EXTRACT_ICONS_SCRIPT } from "./scripts/extractIconsScript";
import type { ExtractedAssets, ExtractedIcons, HeightMode } from "./types";
import { advanceCaptureStep, buildProjectAssets, ensureCaptureNotAborted, initializeCaptureProgress, resolveCaptureTitle } from "./utils";

interface CaptureArgs {
  abortCaptureRef: MutableRefObject<boolean>;
  currentUrl: string;
  heightMode: HeightMode;
  navigate: (path: string) => void;
  setCapturePercent: Dispatch<SetStateAction<number>>;
  setCaptureSteps: Dispatch<SetStateAction<CaptureStep[]>>;
  setIsCapturing: Dispatch<SetStateAction<boolean>>;
  webviewRef: RefObject<Electron.WebviewTag | null>;
}

interface CaptureSequenceResult {
  extractedAssets: ExtractedAssets;
  rawHtml: string;
  thumbnailDataUrl: string;
}

export function useCaptureBrowserCapture(args: CaptureArgs) {
  return useCallback(async () => runCapture(args), [args]);
}

async function runCapture(args: CaptureArgs) {
  const webview = args.webviewRef.current;
  if (!webview || !args.currentUrl) return;
  const progress = { abortCaptureRef: args.abortCaptureRef, setCapturePercent: args.setCapturePercent, setCaptureSteps: args.setCaptureSteps };
  const log = (...logArgs: unknown[]) => window.api.captureLog(...logArgs);
  const detachConsole = attachCaptureConsole(webview, log, progress);
  webview.focus();
  initializeCaptureProgress(progress);
  args.setIsCapturing(true);
  try {
    const result = await performCaptureSequence({ args, webview, log, progress });
    await persistCaptureResult({ args, result, log, progress });
  } catch (error) {
    await handleCaptureError(error, log);
  } finally {
    detachConsole();
    args.setIsCapturing(false);
  }
}

function attachCaptureConsole(
  webview: Electron.WebviewTag,
  log: (...args: unknown[]) => Promise<void>,
  progress: Parameters<typeof initializeCaptureProgress>[0],
) {
  const onConsoleMessage = (event: Electron.ConsoleMessageEvent) => {
    if (!event.message.startsWith("[Capture]")) return;
    const message = event.message.slice(10);
    void log(message);
    const stepMatch = message.match(/\[step:(\w+)\]/);
    if (stepMatch) advanceCaptureStep(stepMatch[1], progress);
  };
  webview.addEventListener("console-message", onConsoleMessage);
  return () => webview.removeEventListener("console-message", onConsoleMessage);
}

interface CaptureSequenceOptions {
  args: CaptureArgs;
  webview: Electron.WebviewTag;
  log: (...args: unknown[]) => Promise<void>;
  progress: Parameters<typeof initializeCaptureProgress>[0];
}

async function performCaptureSequence({ args, webview, log, progress }: CaptureSequenceOptions) {
  await log("Starting capture for", args.currentUrl);
  await captureAndInlineIframes(webview, log, stepKey => advanceCaptureStep(stepKey, progress));
  const rawHtml = await captureHtml(args.heightMode, webview, log);
  ensureCaptureNotAborted(args.abortCaptureRef);
  const extractedAssets = await extractAssets(webview, log, progress);
  ensureCaptureNotAborted(args.abortCaptureRef);
  const thumbnailDataUrl = await captureThumbnail(webview, progress, log);
  ensureCaptureNotAborted(args.abortCaptureRef);
  return { extractedAssets, rawHtml, thumbnailDataUrl };
}

async function captureHtml(heightMode: HeightMode, webview: Electron.WebviewTag, log: (...args: unknown[]) => Promise<void>) {
  await log("Injecting capture script into webview...");
  const rawHtml = await webview.executeJavaScript(createCaptureHtmlScript(heightMode)) as string;
  await log("Webview script finished, got", rawHtml.length, "chars of HTML");
  return rawHtml;
}

async function extractAssets(
  webview: Electron.WebviewTag,
  log: (...args: unknown[]) => Promise<void>,
  progress: Parameters<typeof initializeCaptureProgress>[0],
) {
  advanceCaptureStep("assets", progress);
  await log("Extracting assets (typography & colors)...");
  const extractedAssets = await webview.executeJavaScript(EXTRACT_ASSETS_SCRIPT) as ExtractedAssets;
  await log("Extracted " + extractedAssets.typography.length + " typography styles and " + extractedAssets.colors.length + " colors");
  await log("Detecting icon libraries...");
  const extractedIcons = await webview.executeJavaScript(EXTRACT_ICONS_SCRIPT) as ExtractedIcons;
  await log("Detected icon libraries: " + (extractedIcons.libraries.length > 0 ? extractedIcons.libraries.join(", ") : "none"));
  extractedAssets.icons = extractedIcons;
  advanceCaptureStep("components", progress);
  await log("Detecting reusable components (AI)...");
  const componentResult = await extractComponents(webview, log);
  extractedAssets.components = componentResult.components;
  extractedAssets.componentsCss = componentResult.pageCss;
  return extractedAssets;
}

async function captureThumbnail(
  webview: Electron.WebviewTag,
  progress: Parameters<typeof initializeCaptureProgress>[0],
  log: (...args: unknown[]) => Promise<void>,
) {
  advanceCaptureStep("screenshot", progress);
  await log("Taking screenshot...");
  await webview.executeJavaScript("window.scrollTo(0, 0)");
  await new Promise(resolve => setTimeout(resolve, 100));
  return webview.capturePage().then(image => image.toDataURL());
}

interface PersistCaptureOptions {
  args: CaptureArgs;
  result: CaptureSequenceResult;
  log: (...args: unknown[]) => Promise<void>;
  progress: Parameters<typeof initializeCaptureProgress>[0];
}

async function persistCaptureResult({ args, result, log, progress }: PersistCaptureOptions) {
  advanceCaptureStep("format", progress);
  await log("Formatting HTML...");
  const formatResult = await window.api.formatHtml(result.rawHtml);
  if (!formatResult.success || !formatResult.html) throw new Error(formatResult.error || "Failed to format HTML");
  ensureCaptureNotAborted(args.abortCaptureRef);
  advanceCaptureStep("save", progress);
  await log("Saving project...");
  const project = await window.api.saveProject({ html: formatResult.html, thumbnail: result.thumbnailDataUrl, title: resolveCaptureTitle(args.webviewRef, args.currentUrl), url: args.currentUrl });
  await log("Project saved:", project.id);
  await saveExtractedAssets(project.id, result.extractedAssets, { fontFaceCss: project.fontFaceCss, log });
  progress.setCaptureSteps(previous => previous.map(step => ({ ...step, status: "done" as const })));
  progress.setCapturePercent(100);
  setCapturedHtml(formatResult.html, `mp-asset://assets/${project.id}/`);
  args.navigate(`/editor/${project.id}`);
}

async function saveExtractedAssets(projectId: string, extractedAssets: ExtractedAssets, options: { fontFaceCss?: string | null; log: (...args: unknown[]) => Promise<void> }) {
  const assetsToSave = buildProjectAssets(extractedAssets);
  await window.api.saveProjectAssets(projectId, { ...assetsToSave, fontFaceCss: options.fontFaceCss || undefined });
  await options.log("Assets saved:", assetsToSave.typography.length, "typography,", assetsToSave.colors.length, "colors");
}

async function handleCaptureError(error: unknown, log: (...args: unknown[]) => Promise<void>) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Capture cancelled") return void (await log("Capture cancelled by user"));
  await log("Capture FAILED:", message);
  alert(message || "Failed to capture website state");
}
