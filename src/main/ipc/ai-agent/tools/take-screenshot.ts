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

export const takeScreenshot: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "takeScreenshot",
      description: "Take a screenshot of the current page state. Returns a base64-encoded image along with metadata (dimensions, byte size) for comparison. Use this to visually verify your changes look correct.",
      parameters: {
        type: "object",
        properties: {
          width: { type: "string", description: "Viewport width in pixels (default: 1280)" },
          height: { type: "string", description: "Viewport height in pixels (default: 800)" },
          selector: { type: "string", description: "Optional CSS selector to screenshot only that element" },
        },
        required: [],
      },
    },
  },

  async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
    const width = parseInt(args.width as string) || 1280;
    const height = parseInt(args.height as string) || 800;
    const selector = args.selector as string | undefined;

    try {
      const pup = await getPuppeteer();
      const browser = await pup.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });

      try {
        const page = await browser.newPage();
        await page.setViewport({ width, height });
        await page.setContent(context.getHtml(), { waitUntil: "domcontentloaded", timeout: 10000 });

        const result = await captureScreenshot({ page, selector, viewportWidth: width, viewportHeight: height });
        if (typeof result === "string") return result;

        const byteSize = Math.round(result.buffer.length * 3 / 4);
        const metadata = `[Screenshot: ${result.width}x${result.height}px, ${byteSize} bytes]`;
        return `${metadata}\ndata:image/png;base64,${result.buffer}`;
      } finally {
        await browser.close();
      }
    } catch (e) {
      return `Error taking screenshot: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
