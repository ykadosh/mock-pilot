import { webContents } from "electron";

type CaptureResult =
  | { success: true; dataUrl: string }
  | { success: false; error: string };

interface CaptureArgs {
  webContentsId: number;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

interface NormalizedArgs { width: number; height: number; scale: number }

function normalizeArgs(args: CaptureArgs): NormalizedArgs {
  return {
    width: Math.max(1, Math.round(args.width)),
    height: Math.max(1, Math.round(args.height)),
    scale: args.deviceScaleFactor && args.deviceScaleFactor > 0 ? args.deviceScaleFactor : 1,
  };
}

async function captureWithOverride(target: Electron.WebContents, { width, height, scale }: NormalizedArgs): Promise<string> {
  await target.debugger.sendCommand("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
  try {
    const result = await target.debugger.sendCommand("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
      clip: { x: 0, y: 0, width, height, scale },
    }) as { data: string };
    return `data:image/png;base64,${result.data}`;
  } finally {
    try { await target.debugger.sendCommand("Emulation.clearDeviceMetricsOverride"); } catch { /* ignore */ }
  }
}

// Captures the full target rect using the Chrome DevTools Protocol's
// Page.captureScreenshot with captureBeyondViewport: true. This bypasses the
// limit imposed by webview.capturePage(), which only returns the portion of
// the page that is currently painted inside the host BrowserWindow viewport.
//
// To make the captured content actually fill the clip (instead of Chromium
// tiling the existing viewport over the larger area), we first override the
// device metrics so the layout viewport itself matches the requested size,
// then capture, then clear the override.
export async function handleCaptureFullPage(
  _event: Electron.IpcMainInvokeEvent,
  args: CaptureArgs,
): Promise<CaptureResult> {
  const target = webContents.fromId(args.webContentsId);
  if (!target) return { success: false, error: "WebContents not found" };
  const normalized = normalizeArgs(args);
  const wasAttached = target.debugger.isAttached();
  try {
    if (!wasAttached) target.debugger.attach("1.3");
    const dataUrl = await captureWithOverride(target, normalized);
    return { success: true, dataUrl };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    if (!wasAttached && target.debugger.isAttached()) {
      try { target.debugger.detach(); } catch { /* ignore */ }
    }
  }
}
