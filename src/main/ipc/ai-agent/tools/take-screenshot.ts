import type { ToolDefinition, ToolContext } from "../agent-types";
import type puppeteer from "puppeteer";

type PuppeteerModule = typeof puppeteer;

let pup: PuppeteerModule | null = null;

async function getPuppeteer(): Promise<PuppeteerModule> {
  if (!pup) pup = await import("puppeteer") as unknown as PuppeteerModule;
  return pup;
}

interface ScreenshotResult {
  buffer: string;
  width: number;
  height: number;
}

interface CaptureOptions {
  page: puppeteer.Page;
  selector: string | undefined;
  viewportWidth: number;
  viewportHeight: number;
}

async function captureScreenshot({ page, selector, viewportWidth, viewportHeight }: CaptureOptions): Promise<ScreenshotResult | string> {
  if (!selector) {
    const buffer = await page.screenshot({ encoding: "base64", fullPage: false }) as string;
    return { buffer, width: viewportWidth, height: viewportHeight };
  }

  const element = await page.$(selector);
  if (!element) return `Element "${selector}" not found for screenshot.`;

  const box = await element.boundingBox();
  const buffer = await element.screenshot({ encoding: "base64" }) as string;
  return {
    buffer,
    width: box ? Math.round(box.width) : viewportWidth,
    height: box ? Math.round(box.height) : viewportHeight,
  };
}

function checkScreenshotThrottle(context: ToolContext, key: string): string | null {
  const SCREENSHOT_COOLDOWN = 3;
  const currentIter = context.currentIteration ?? 0;
  const lastIter = context.lastScreenshotIteration?.get(key);
  if (lastIter !== undefined && currentIter - lastIter < SCREENSHOT_COOLDOWN) {
    const wait = SCREENSHOT_COOLDOWN - (currentIter - lastIter);
    return `[Screenshot throttled] You already screenshotted "${key}" ${currentIter - lastIter} iteration(s) ago. Wait ${wait} more iteration(s), use a different selector, or rely on searchHtml/searchCss/getElementInfo to verify state. Avoid redundant screenshots — they are expensive.`;
  }
  context.lastScreenshotIteration?.set(key, currentIter);
  return null;
}

function resolveSelector(args: Record<string, unknown>, context: ToolContext): { selector?: string; autoDefaulted: boolean } {
  const explicit = args.selector as string | undefined;
  if (explicit) return { selector: explicit, autoDefaulted: false };
  if (context.defaultSelector) return { selector: context.defaultSelector, autoDefaulted: true };
  return { selector: undefined, autoDefaulted: false };
}

async function runScreenshot(context: ToolContext, args: Record<string, unknown>): Promise<string> {
  const width = parseInt(args.width as string) || 1280;
  const height = parseInt(args.height as string) || 800;
  const { selector, autoDefaulted } = resolveSelector(args, context);

  const throttleMsg = checkScreenshotThrottle(context, selector || "_full");
  if (throttleMsg) return throttleMsg;

  const pup = await getPuppeteer();
  const browser = await pup.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(context.getHtml(), { waitUntil: "domcontentloaded", timeout: 10000 });

    const result = await captureScreenshot({ page, selector, viewportWidth: width, viewportHeight: height });
    if (typeof result === "string") return result;

    context.markInspection?.();
    const byteSize = Math.round(result.buffer.length * 3 / 4);
    const note = autoDefaulted ? ` (auto-scoped to attached element "${selector}")` : "";
    return `[Screenshot: ${result.width}x${result.height}px, ${byteSize} bytes${note}]\ndata:image/png;base64,${result.buffer}`;
  } finally {
    await browser.close();
  }
}

export const takeScreenshot: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "takeScreenshot",
      description: "Take a screenshot of the current page state. PREFER scoping to a selector — full-page screenshots are slow (1280x800 ≈ 130KB base64) and bloat conversation context. If the user attached an element to the prompt, omit `selector` and the tool will auto-default to it. Otherwise pass a specific selector like the parent container of your changes.",
      parameters: {
        type: "object",
        properties: {
          width: { type: "string", description: "Viewport width in pixels (default: 1280)" },
          height: { type: "string", description: "Viewport height in pixels (default: 800)" },
          selector: { type: "string", description: "Optional CSS selector to screenshot only that element. Strongly recommended." },
        },
        required: [],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    try {
      return await runScreenshot(context, args);
    } catch (e) {
      return `Error taking screenshot: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
