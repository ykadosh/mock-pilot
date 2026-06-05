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

// Captures the full target rect using the Chrome DevTools Protocol's
// Page.captureScreenshot with captureBeyondViewport: true. This bypasses the
// limit imposed by webview.capturePage(), which only returns the portion of
// the page that is currently painted inside the host BrowserWindow viewport.
// With captureBeyondViewport, Chromium renders and captures the requested clip
// rect regardless of how much is currently on-screen.
export async function handleCaptureFullPage(
  _event: Electron.IpcMainInvokeEvent,
  args: CaptureArgs,
): Promise<CaptureResult> {
  const target = webContents.fromId(args.webContentsId);
  if (!target) return { success: false, error: "WebContents not found" };

  const width = Math.max(1, Math.round(args.width));
  const height = Math.max(1, Math.round(args.height));
  const scale = args.deviceScaleFactor && args.deviceScaleFactor > 0 ? args.deviceScaleFactor : 1;

  const wasAttached = target.debugger.isAttached();
  try {
    if (!wasAttached) target.debugger.attach("1.3");
    const result = await target.debugger.sendCommand("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      fromSurface: true,
      clip: { x: 0, y: 0, width, height, scale },
    }) as { data: string };
    return { success: true, dataUrl: `data:image/png;base64,${result.data}` };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    if (!wasAttached && target.debugger.isAttached()) {
      try { target.debugger.detach(); } catch { /* ignore */ }
    }
  }
}
