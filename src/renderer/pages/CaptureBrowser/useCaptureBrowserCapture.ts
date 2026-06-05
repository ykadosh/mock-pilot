import { useCallback } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { CaptureStep } from "../../components/CaptureProgressModal";
import { setCapturedHtml } from "../../lib/store";
import { applyCropExtension, capturePreviewForCrop, cropCapturedThumbnail } from "./cropCaptureHelpers";
import { captureAndInlineIframes } from "./iframeCapture";
import { createCaptureHtmlScript } from "./scripts/captureHtmlScript";
import { EXTRACT_ASSETS_SCRIPT } from "./scripts/extractAssetsScript";
import { EXTRACT_ICONS_SCRIPT } from "./scripts/extractIconsScript";
import type { CropPreview, CropRegion, ExtractedAssets, ExtractedIcons, HeightMode } from "./types";
import {
  advanceCaptureStep,
  buildProjectAssets,
  ensureCaptureNotAborted,
  initializeCaptureProgress,
  resolveCaptureTitle,
  restoreWebviewHeight,
  type WebviewSizeSnapshot,
} from "./utils";

interface CaptureArgs {
  abortCaptureRef: MutableRefObject<boolean>;
  currentUrl: string;
  heightMode: HeightMode;
  navigate: (path: string) => void;
  promptForCrop: (preview: CropPreview) => Promise<CropRegion | null>;
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

type Progress = Parameters<typeof initializeCaptureProgress>[0];
type Logger = (...args: unknown[]) => Promise<void>;

export function useCaptureBrowserCapture(args: CaptureArgs) {
  return useCallback(async () => runCapture(args), [args]);
}

async function runCapture(args: CaptureArgs) {
  const webview = args.webviewRef.current;
  if (!webview || !args.currentUrl) return;
  const progress: Progress = { abortCaptureRef: args.abortCaptureRef, setCapturePercent: args.setCapturePercent, setCaptureSteps: args.setCaptureSteps };
  const log: Logger = (...logArgs) => window.api.captureLog(...logArgs);
  const detachConsole = attachCaptureConsole({ webview, log, progress });
  webview.focus();
  let extensionSnapshot: WebviewSizeSnapshot | null = null;
  try {
    const preview = await capturePreviewForCrop(webview, log);
    const cropRegion = await args.promptForCrop(preview);
    if (!cropRegion) { await log("Capture cancelled at crop step"); return; }
    initializeCaptureProgress(progress);
    args.setIsCapturing(true);
    extensionSnapshot = await applyCropExtension({ webview, preview, cropRegion, log });
    const result = await performCaptureSequence({ args, webview, log, progress, cropRegion, preview });
    await persistCaptureResult({ args, result, log, progress });
  } catch (error) {
    await handleCaptureError(error, log);
  } finally {
    if (extensionSnapshot) restoreWebviewHeight(webview, extensionSnapshot);
    detachConsole();
    args.setIsCapturing(false);
  }
}

interface ConsoleOptions { webview: Electron.WebviewTag; log: Logger; progress: Progress }

function attachCaptureConsole({ webview, log, progress }: ConsoleOptions) {
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
  log: Logger;
  progress: Progress;
  cropRegion: CropRegion;
  preview: CropPreview;
}

async function performCaptureSequence({ args, webview, log, progress, cropRegion, preview }: CaptureSequenceOptions) {
  await log("Starting capture for", args.currentUrl);
  await captureAndInlineIframes(webview, log, stepKey => advanceCaptureStep(stepKey, progress));
  const rawHtml = await captureHtml({ heightMode: args.heightMode, webview, log, cropRegion, naturalHeight: preview.naturalHeight });
  ensureCaptureNotAborted(args.abortCaptureRef);
  const extractedAssets = await extractAssets({ webview, log, progress });
  ensureCaptureNotAborted(args.abortCaptureRef);
  advanceCaptureStep("screenshot", progress);
  const thumbnailDataUrl = await cropCapturedThumbnail({ webview, log, cropRegion, viewportWidth: preview.viewportWidth });
  ensureCaptureNotAborted(args.abortCaptureRef);
  return { extractedAssets, rawHtml, thumbnailDataUrl };
}

interface CaptureHtmlOptions { heightMode: HeightMode; webview: Electron.WebviewTag; log: Logger; cropRegion: CropRegion; naturalHeight: number }

async function captureHtml({ heightMode, webview, log, cropRegion, naturalHeight }: CaptureHtmlOptions) {
  await log("Injecting capture script into webview...");
  const rawHtml = await webview.executeJavaScript(createCaptureHtmlScript(heightMode, cropRegion, naturalHeight)) as string;
  await log("Webview script finished, got", rawHtml.length, "chars of HTML");
  return rawHtml;
}

interface ExtractOptions { webview: Electron.WebviewTag; log: Logger; progress: Progress }

async function extractAssets({ webview, log, progress }: ExtractOptions) {
  advanceCaptureStep("assets", progress);
  await log("Extracting assets (typography & colors)...");
  const extractedAssets = await webview.executeJavaScript(EXTRACT_ASSETS_SCRIPT) as ExtractedAssets;
  await log("Extracted " + extractedAssets.typography.length + " typography styles and " + extractedAssets.colors.length + " colors");
  await log("Detecting icon libraries...");
  const extractedIcons = await webview.executeJavaScript(EXTRACT_ICONS_SCRIPT) as ExtractedIcons;
  await log("Detected icon libraries: " + (extractedIcons.libraries.length > 0 ? extractedIcons.libraries.join(", ") : "none"));
  extractedAssets.icons = extractedIcons;
  return extractedAssets;
}

interface PersistCaptureOptions {
  args: CaptureArgs;
  result: CaptureSequenceResult;
  log: Logger;
  progress: Progress;
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
  await saveExtractedAssets({ projectId: project.id, extractedAssets: result.extractedAssets, fontFaceCss: project.fontFaceCss, log });
  progress.setCaptureSteps(previous => previous.map(step => ({ ...step, status: "done" as const })));
  progress.setCapturePercent(100);
  setCapturedHtml(formatResult.html, `mp-asset://assets/${project.id}/`);
  args.navigate(`/editor/${project.id}`);
}

interface SaveAssetsOptions { projectId: string; extractedAssets: ExtractedAssets; fontFaceCss?: string | null; log: Logger }

async function saveExtractedAssets({ projectId, extractedAssets, fontFaceCss, log }: SaveAssetsOptions) {
  const assetsToSave = buildProjectAssets(extractedAssets);
  await window.api.saveProjectAssets(projectId, { ...assetsToSave, fontFaceCss: fontFaceCss || undefined });
  await log("Assets saved:", assetsToSave.typography.length, "typography,", assetsToSave.colors.length, "colors");
}

async function handleCaptureError(error: unknown, log: Logger) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Capture cancelled") return void (await log("Capture cancelled by user"));
  await log("Capture FAILED:", message);
  alert(message || "Failed to capture website state");
}
