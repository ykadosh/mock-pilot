import type { ToolDefinition, ToolContext } from "../agent-types";
import type puppeteer from "puppeteer";

type PuppeteerModule = typeof puppeteer;

let pup: PuppeteerModule | null = null;

async function getPuppeteer(): Promise<PuppeteerModule> {
  if (!pup) pup = await import("puppeteer") as unknown as PuppeteerModule;
  return pup;
}

async function captureElement(page: puppeteer.Page, selector: string): Promise<string> {
  const element = await page.$(selector);
  if (!element) return `Element "${selector}" not found for screenshot.`;
  const buffer = await element.screenshot({ encoding: "base64" });
  return `data:image/png;base64,${buffer as string}`;
}

export const takeScreenshot: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "takeScreenshot",
      description: "Take a screenshot of the current page state. Returns a base64-encoded image. Use this to visually verify your changes look correct.",
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

        if (selector) return await captureElement(page, selector);
        const buffer = await page.screenshot({ encoding: "base64", fullPage: false });
        return `data:image/png;base64,${buffer as string}`;
      } finally {
        await browser.close();
      }
    } catch (e) {
      return `Error taking screenshot: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
