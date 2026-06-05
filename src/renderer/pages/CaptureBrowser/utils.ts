import type { RefObject } from "react";
import { CAPTURE_STEPS } from "./constants";
import type { CaptureProgressState, ExtractedAssets } from "./types";

export function normalizeCaptureUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function initializeCaptureProgress(progress: CaptureProgressState) {
  progress.abortCaptureRef.current = false;
  progress.setCaptureSteps(CAPTURE_STEPS.map(step => ({ label: step.label, status: "waiting" as const })));
  progress.setCapturePercent(0);
}

export function advanceCaptureStep(stepKey: string, progress: CaptureProgressState) {
  const stepIndex = CAPTURE_STEPS.findIndex(step => step.key === stepKey);
  if (stepIndex === -1) return;
  progress.setCaptureSteps(previous => previous.map((step, index) => ({ ...step, status: resolveStepStatus(index, stepIndex, step.status) })));
  progress.setCapturePercent(Math.round((stepIndex / CAPTURE_STEPS.length) * 100));
}

function resolveStepStatus(index: number, activeIndex: number, currentStatus: string) {
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "in-progress";
  return currentStatus === "done" ? "done" : "waiting";
}

export function ensureCaptureNotAborted(abortCaptureRef: CaptureProgressState["abortCaptureRef"]) {
  if (abortCaptureRef.current) throw new Error("Capture cancelled");
}

export function resolveCaptureTitle(webviewRef: RefObject<Electron.WebviewTag | null>, currentUrl: string) {
  try {
    const pageTitle = webviewRef.current?.getTitle?.();
    if (pageTitle?.trim()) return pageTitle.trim();
    return new URL(currentUrl).hostname.replace(/^www\./, "");
  } catch {
    return currentUrl;
  }
}

export function buildProjectAssets(extractedAssets: ExtractedAssets) {
  return {
    typography: extractedAssets.typography.map((asset, index) => ({
      id: `typo-${index}`,
      label: `${asset.fontFamily.split(",")[0].replace(/['"]/g, "").trim()} ${asset.fontSize} ${asset.fontWeight}`,
      ...asset,
    })),
    colors: extractedAssets.colors.map((asset, index) => ({ id: `color-${index}`, label: "", value: asset.value })),
    icons: extractedAssets.icons,
    components: (extractedAssets.components || []).map((component, index) => ({
      id: `comp-${index}`,
      label: component.label,
      html: component.html,
      count: component.count,
      hash: component.hash,
      description: component.description,
      props: component.props,
    })),
    componentsCss: extractedAssets.componentsCss,
  };
}

export interface WebviewSizeSnapshot {
  height: string;
  minHeight: string;
  maxHeight: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  zIndex: string;
}

// Forces the webview's rendered height to `heightPx` so that capturePage() returns
// the full page (or a taller-than-natural extension when the user crops past the
// page bottom). The webview is normally `flex-1` inside its container; switching
// to `position: absolute` lifts it out of flex layout so the imposed height takes
// effect and the guest WebContents actually renders at that height.
export function forceWebviewHeight(webview: Electron.WebviewTag, heightPx: number): WebviewSizeSnapshot {
  const s = webview.style;
  const snapshot: WebviewSizeSnapshot = {
    height: s.height, minHeight: s.minHeight, maxHeight: s.maxHeight,
    position: s.position, top: s.top, left: s.left, right: s.right, width: s.width, zIndex: s.zIndex,
  };
  s.position = "absolute";
  s.top = "0";
  s.left = "0";
  s.right = "0";
  s.width = "100%";
  s.zIndex = "0";
  s.height = `${heightPx}px`;
  s.minHeight = `${heightPx}px`;
  s.maxHeight = `${heightPx}px`;
  return snapshot;
}

export function restoreWebviewHeight(webview: Electron.WebviewTag, snapshot: WebviewSizeSnapshot) {
  const s = webview.style;
  s.height = snapshot.height;
  s.minHeight = snapshot.minHeight;
  s.maxHeight = snapshot.maxHeight;
  s.position = snapshot.position;
  s.top = snapshot.top;
  s.left = snapshot.left;
  s.right = snapshot.right;
  s.width = snapshot.width;
  s.zIndex = snapshot.zIndex;
}

export async function waitForLayoutSettle(webview: Electron.WebviewTag, delayMs = 200) {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  try { await webview.executeJavaScript("new Promise(r => requestAnimationFrame(() => r()))"); } catch { /* webview not ready */ }
}
