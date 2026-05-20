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
  };
}
