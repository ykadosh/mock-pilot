import { forceWebviewHeight, restoreWebviewHeight, waitForLayoutSettle } from "./utils";

type Logger = (...args: unknown[]) => Promise<void>;

export interface StitchResult { dataUrl: string; width: number; height: number; scale: number }
interface ChunkData { bitmap: ImageBitmap; y: number; h: number }

async function nativeImageToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

async function captureChunksByTranslate(
  webview: Electron.WebviewTag,
  chunkCssHeight: number,
  targetHeight: number,
): Promise<ChunkData[]> {
  const chunks: ChunkData[] = [];
  const numChunks = Math.ceil(targetHeight / chunkCssHeight);
  for (let i = 0; i < numChunks; i++) {
    const offset = i * chunkCssHeight;
    await webview.executeJavaScript(
      `(() => { const el = document.documentElement; el.style.transform = 'translateY(${-offset}px)'; el.style.transformOrigin = 'top left'; })()`,
    );
    await new Promise<void>((r) => setTimeout(r, 130));
    const image = await webview.capturePage();
    const bitmap = await nativeImageToBitmap(image.toDataURL());
    const h = Math.min(chunkCssHeight, targetHeight - offset);
    chunks.push({ bitmap, y: offset, h });
  }
  return chunks;
}

async function clearTranslate(webview: Electron.WebviewTag) {
  try {
    await webview.executeJavaScript(
      "(() => { const el = document.documentElement; el.style.transform = ''; el.style.transformOrigin = ''; })()",
    );
  } catch { /* webview gone */ }
}

function stitchChunks(chunks: ChunkData[], viewportWidth: number, targetHeight: number): StitchResult {
  const firstBitmap = chunks[0]?.bitmap;
  const scale = firstBitmap && viewportWidth > 0 ? firstBitmap.width / viewportWidth : 1;
  const canvasWidth = firstBitmap ? firstBitmap.width : Math.round(viewportWidth * scale);
  const canvasHeight = Math.max(1, Math.round(targetHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D canvas context for stitching");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  for (const chunk of chunks) {
    const sourceHeight = Math.round(chunk.h * scale);
    const destY = Math.round(chunk.y * scale);
    ctx.drawImage(chunk.bitmap, 0, 0, chunk.bitmap.width, sourceHeight, 0, destY, canvasWidth, sourceHeight);
    chunk.bitmap.close();
  }
  return { dataUrl: canvas.toDataURL("image/png"), width: canvasWidth, height: canvasHeight, scale };
}

// Captures from y=0 to targetHeight by (a) sizing the webview to targetHeight so
// the OOPIF viewport reflows for that height, and (b) translateY-ing the document
// in host-viewport-sized steps, capturing each step with webview.capturePage()
// (which is clamped to the host viewport). Each translate exposes a different
// vertical band of the reflowed page in the painted host area.
export async function scrollStitchCapture(
  webview: Electron.WebviewTag,
  targetHeight: number,
  log: Logger,
): Promise<StitchResult> {
  const hostRect = webview.getBoundingClientRect();
  const viewportWidth = Math.round(hostRect.width);
  const chunkCssHeight = Math.max(1, Math.round(hostRect.height));
  await log(`Scroll-stitch capture: target=${targetHeight}px chunk=${chunkCssHeight}px viewportWidth=${viewportWidth}px`);
  const snapshot = forceWebviewHeight(webview, targetHeight);
  await waitForLayoutSettle(webview, 250);
  await webview.executeJavaScript("window.dispatchEvent(new Event('resize'))");
  await waitForLayoutSettle(webview, 250);
  let chunks: ChunkData[] = [];
  try {
    chunks = await captureChunksByTranslate(webview, chunkCssHeight, targetHeight);
  } finally {
    await clearTranslate(webview);
    restoreWebviewHeight(webview, snapshot);
  }
  return stitchChunks(chunks, viewportWidth, targetHeight);
}
