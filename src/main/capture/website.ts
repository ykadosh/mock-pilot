import type { Browser, Page } from "puppeteer";

import {
  buildScopeId,
  getIframeData,
  inlineCaptureScript,
  replaceCapturedIframe,
  replaceIframeWithPlaceholder,
  resolveIframeUrl,
  type IframeData,
} from "./website-utils";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { html_beautify } = require("js-beautify");

const CAPTURE_TIMEOUT_MS = 30000;
const EVALUATE_TIMEOUT_MS = 60000;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

type CaptureWebsiteResult =
  | { success: true; html: string; thumbnail: string; title?: string }
  | { success: false; error: string };

type PuppeteerModule = {
  launch(options: { headless: boolean; args: string[] }): Promise<Browser>;
};

type CaptureIframeOptions = {
  page: Page;
  browser: Browser;
  iframe: IframeData;
  depth: number;
  maxDepth: number;
  iframeTimeout: number;
};

type CaptureIframesOptions = {
  page: Page;
  browser: Browser;
  depth?: number;
  maxDepth?: number;
  iframeTimeout?: number;
};

function loadPuppeteer(): PuppeteerModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("puppeteer") as PuppeteerModule;
}

async function withBrowser<T>(run: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await loadPuppeteer().launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    return await run(browser);
  } finally {
    await browser.close();
  }
}

async function openCapturePage(browser: Browser, targetUrl: string, timeout = CAPTURE_TIMEOUT_MS): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport(DEFAULT_VIEWPORT);
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout });
  return page;
}

function formatCapturedHtml(rawHtml: string): string {
  const formattedHtml = html_beautify(rawHtml, {
    indent_size: 2,
    indent_char: " ",
    max_preserve_newlines: 1,
    preserve_newlines: true,
    wrap_line_length: 0,
    end_with_newline: true,
    indent_inner_html: true,
    css_indent_size: 2,
    content_unformatted: ["pre", "code", "textarea"],
  });
  return `<!DOCTYPE html>\n${formattedHtml}`;
}

async function scrollPageToTriggerLazyLoads(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight - 50);
    const maxScroll = document.documentElement.scrollHeight;
    for (let pos = 0; pos < maxScroll; pos += step) {
      window.scrollTo(0, pos);
      await new Promise(r => setTimeout(r, 80));
    }
    window.scrollTo(0, maxScroll);
    await new Promise(r => setTimeout(r, 200));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 100));
  });
}

async function buildPageCapture(page: Page): Promise<CaptureWebsiteResult> {
  await scrollPageToTriggerLazyLoads(page);
  const html = await page.evaluate(inlineCaptureScript);
  const title = (await page.title()) || undefined;
  await page.evaluate(() => window.scrollTo(0, 0));
  const screenshot = (await page.screenshot({ type: "png", encoding: "base64" })) as string;
  return { success: true, html: formatCapturedHtml(html), thumbnail: `data:image/png;base64,${screenshot}`, title };
}

async function captureIframeAtIndex(options: CaptureIframeOptions): Promise<void> {
  const { page, browser, iframe, depth, maxDepth, iframeTimeout } = options;
  const resolvedUrl = await resolveIframeUrl(page, iframe.src);
  const iframePage = await openCapturePage(browser, resolvedUrl, iframeTimeout);

  try {
    iframePage.setDefaultTimeout(iframeTimeout);
    await captureIframesRecursively({ page: iframePage, browser, depth: depth + 1, maxDepth, iframeTimeout });
    const capturedHtml = await iframePage.evaluate(inlineCaptureScript);
    await replaceCapturedIframe(page, { iframeIndex: iframe.index, capturedHtml, scopeId: buildScopeId(depth, iframe.index) });
  } catch {
    await replaceIframeWithPlaceholder(page, iframe.index).catch(() => undefined);
  } finally {
    await iframePage.close();
  }
}

async function captureIframesRecursively({
  page,
  browser,
  depth = 0,
  maxDepth = 3,
  iframeTimeout = CAPTURE_TIMEOUT_MS,
}: CaptureIframesOptions): Promise<void> {
  if (depth >= maxDepth) return;
  const iframeData = await getIframeData(page);
  for (const iframe of [...iframeData].reverse()) {
    await captureIframeAtIndex({ page, browser, iframe, depth, maxDepth, iframeTimeout });
  }
}

async function captureWebsite(browser: Browser, url: string): Promise<CaptureWebsiteResult> {
  const page = await openCapturePage(browser, url);
  try {
    page.setDefaultTimeout(EVALUATE_TIMEOUT_MS);
    await captureIframesRecursively({ page, browser });
    return await buildPageCapture(page);
  } finally {
    await page.close();
  }
}

export async function handleCaptureWebsite(
  _event: Electron.IpcMainInvokeEvent,
  url: string
): Promise<CaptureWebsiteResult> {
  try {
    return await withBrowser((browser) => captureWebsite(browser, url));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
