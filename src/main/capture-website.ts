import type { Browser, Page } from "puppeteer";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { html_beautify } = require("js-beautify");

const CAPTURE_TIMEOUT_MS = 30000;
const EVALUATE_TIMEOUT_MS = 60000;
const DEFAULT_VIEWPORT = { width: 1280, height: 800 };

const inlineCaptureScript = String.raw`(async ()=>{const blobToDataUri=(blob)=>new Promise((resolve)=>{const reader=new FileReader();reader.onloadend=()=>resolve(reader.result);reader.readAsDataURL(blob);});const fetchAsDataUri=async(resourceUrl)=>{const response=await fetch(resourceUrl);if(!response.ok)return null;return blobToDataUri(await response.blob());};const inlineCssUrls=async(cssText,baseUrl,regex,includeFormat)=>{let updatedCss=cssText;for(const match of cssText.matchAll(regex)){if(match[1].startsWith("data:"))continue;try{const dataUri=await fetchAsDataUri(new URL(match[1],baseUrl).href);if(!dataUri)continue;const replacement=includeFormat?'url("'+dataUri+'") format("'+match[2]+'")':'url("'+dataUri+'")';updatedCss=updatedCss.replace(match[0],replacement);}catch{}}return updatedCss;};const inlineFontUrls=async(cssText,baseUrl)=>{let updatedCss=cssText;for(const faceMatch of cssText.matchAll(/@font-face\s*\{[^}]*\}/gi)){let faceBlock=faceMatch[0];faceBlock=await inlineCssUrls(faceBlock,baseUrl,/url\(["']?([^"')]+?)["']?\)\s*format\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\)/gi,true);faceBlock=await inlineCssUrls(faceBlock,baseUrl,/url\(["']?([^"')]+\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\)/gi,false);updatedCss=updatedCss.replace(faceMatch[0],faceBlock);}return updatedCss;};for(const link of document.querySelectorAll('link[rel="stylesheet"]')){try{const href=link.href;const cssResponse=await fetch(href);const cssText=await inlineFontUrls(await cssResponse.text(),href);const style=document.createElement("style");style.textContent=cssText;link.replaceWith(style);}catch{}}for(const style of document.querySelectorAll("style")){style.textContent=await inlineFontUrls(style.textContent||"",document.baseURI);}for(const img of document.querySelectorAll("img")){try{const canvas=document.createElement("canvas");canvas.width=img.naturalWidth||img.width||300;canvas.height=img.naturalHeight||img.height||200;const context=canvas.getContext("2d");if(context&&img.complete&&img.naturalWidth>0){context.drawImage(img,0,0);img.src=canvas.toDataURL("image/png");}}catch{}}document.querySelectorAll("script").forEach((script)=>script.remove());document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((element)=>element.remove());const commentWalker=document.createTreeWalker(document,NodeFilter.SHOW_COMMENT);const comments=[];while(commentWalker.nextNode())comments.push(commentWalker.currentNode);comments.forEach((comment)=>comment.remove());const textWalker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);const textNodes=[];while(textWalker.nextNode())textNodes.push(textWalker.currentNode);textNodes.forEach((textNode)=>{if(!textNode.textContent||!/^\s+$/.test(textNode.textContent))return;let ancestor=textNode.parentElement;while(ancestor){if(ancestor.tagName==="PRE")return;ancestor=ancestor.parentElement;}textNode.textContent="\n";});return document.documentElement.outerHTML;})()`;

const replaceCapturedIframeHelperSource = String.raw`const iframes=document.querySelectorAll("iframe");const iframe=iframes[params.iframeIndex];if(!iframe)return;const parser=new DOMParser();const doc=parser.parseFromString(params.capturedHtml,"text/html");const container=document.createElement("div");container.setAttribute("data-iframe-inline",params.scopeId);container.setAttribute("data-iframe-src",iframe.getAttribute("src")||"");const width=iframe.getAttribute("width")||iframe.style.width||"100%";const height=iframe.getAttribute("height")||iframe.style.height||"auto";container.style.width=typeof width==="string"&&width.includes("%")?width:width+"px";container.style.height=height==="auto"||(typeof height==="string"&&height.includes("%"))?height:height+"px";container.style.overflow="hidden";container.style.position="relative";const scopeSelector='[data-iframe-inline="'+params.scopeId+'"]';for(const style of doc.querySelectorAll("style")){let css=style.textContent||"";css=css.replace(/([^{}]+)\{/g,(match,selectors)=>{if(selectors.trim().startsWith("@"))return match;const scopedSelectors=selectors.split(",").map((selector)=>{const trimmed=selector.trim();if(!trimmed)return selector;if(trimmed==="html"||trimmed==="body"||trimmed===":root")return scopeSelector;return scopeSelector+" "+trimmed;}).join(",");return scopedSelectors+"{";});const scopedStyle=document.createElement("style");scopedStyle.textContent=css;container.appendChild(scopedStyle);}const contentWrapper=document.createElement("div");contentWrapper.innerHTML=doc.body?doc.body.innerHTML:doc.documentElement.innerHTML;container.appendChild(contentWrapper);iframe.replaceWith(container);`;

type CaptureWebsiteResult =
  | { success: true; html: string; thumbnail: string; title?: string }
  | { success: false; error: string };

type PuppeteerModule = {
  launch(options: { headless: boolean; args: string[] }): Promise<Browser>;
};

type IframeData = { index: number; src: string };
type ReplaceIframeParams = { iframeIndex: number; capturedHtml: string; scopeId: string };

function loadPuppeteer(): PuppeteerModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("puppeteer") as PuppeteerModule;
}

async function withBrowser<T>(run: (browser: Browser) => Promise<T>): Promise<T> {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
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

async function buildPageCapture(page: Page): Promise<CaptureWebsiteResult> {
  const html = await page.evaluate(inlineCaptureScript);
  const title = (await page.title()) || undefined;
  await page.evaluate(() => window.scrollTo(0, 0));
  const screenshot = (await page.screenshot({ type: "png", encoding: "base64" })) as string;
  return {
    success: true,
    html: formatCapturedHtml(html),
    thumbnail: `data:image/png;base64,${screenshot}`,
    title,
  };
}

async function getIframeData(page: Page): Promise<IframeData[]> {
  return page.evaluate(() => {
    const iframes = document.querySelectorAll("iframe");
    const data: Array<{ index: number; src: string }> = [];
    iframes.forEach((iframe, index) => {
      const src = iframe.getAttribute("src") || iframe.src;
      if (src && src !== "about:blank" && !src.startsWith("javascript:") && !src.startsWith("data:")) {
        data.push({ index, src });
      }
    });
    return data;
  });
}

async function resolveIframeUrl(page: Page, src: string): Promise<string> {
  return page.evaluate((candidate: string) => {
    try {
      return new URL(candidate, document.baseURI).href;
    } catch {
      return candidate;
    }
  }, src);
}

async function replaceCapturedIframe(page: Page, params: ReplaceIframeParams): Promise<void> {
  await page.evaluate(({ helperSource, iframeParams }) => {
    const replaceIframe = new Function("params", helperSource) as (args: typeof iframeParams) => void;
    replaceIframe(iframeParams);
  }, { helperSource: replaceCapturedIframeHelperSource, iframeParams: params });
}

async function replaceIframeWithPlaceholder(page: Page, iframeIndex: number): Promise<void> {
  await page.evaluate((index: number) => {
    const iframes = document.querySelectorAll("iframe");
    const iframe = iframes[index];
    if (!iframe) return;
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-iframe-failed", "true");
    placeholder.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");
    placeholder.style.border = "1px dashed #ccc";
    placeholder.style.padding = "1em";
    placeholder.style.textAlign = "center";
    placeholder.style.color = "#999";
    placeholder.textContent = `[iframe content could not be captured: ${iframe.getAttribute("src") || "unknown"}]`;
    iframe.replaceWith(placeholder);
  }, iframeIndex);
}

function buildScopeId(depth: number, index: number): string {
  return `iframe-inline-${depth}-${index}`;
}

function logIframeFailure(index: number, src: string, error: unknown): void {
  const message = error instanceof Error ? error.message : error;
  console.error(`[Capture] Failed to capture iframe ${index} (${src}):`, message);
}

async function captureIframeAtIndex(
  page: Page,
  browser: Browser,
  iframe: IframeData,
  depth: number,
  maxDepth: number,
  iframeTimeout: number
): Promise<void> {
  const resolvedUrl = await resolveIframeUrl(page, iframe.src);
  console.log(`[Capture] Processing iframe ${iframe.index}: ${resolvedUrl.substring(0, 80)}`);
  const iframePage = await openCapturePage(browser, resolvedUrl, iframeTimeout);
  try {
    iframePage.setDefaultTimeout(iframeTimeout);
    await captureIframesRecursively(iframePage, browser, depth + 1, maxDepth, iframeTimeout);
    const iframeHtml = await iframePage.evaluate(inlineCaptureScript);
    await replaceCapturedIframe(page, {
      iframeIndex: iframe.index,
      capturedHtml: iframeHtml,
      scopeId: buildScopeId(depth, iframe.index),
    });
  } catch (error) {
    logIframeFailure(iframe.index, iframe.src, error);
    await replaceIframeWithPlaceholder(page, iframe.index).catch(() => undefined);
  } finally {
    await iframePage.close();
  }
}

async function captureIframesRecursively(
  page: Page,
  browser: Browser,
  depth = 0,
  maxDepth = 3,
  iframeTimeout = CAPTURE_TIMEOUT_MS
): Promise<void> {
  if (depth >= maxDepth) return;
  const iframeData = await getIframeData(page);
  if (iframeData.length === 0) {
    console.log(`[Capture] No iframes found at depth ${depth}`);
    return;
  }
  console.log(`[Capture] Found ${iframeData.length} iframe(s) at depth ${depth}`);
  for (const iframe of [...iframeData].reverse()) {
    await captureIframeAtIndex(page, browser, iframe, depth, maxDepth, iframeTimeout);
  }
}

async function captureWebsite(browser: Browser, url: string): Promise<CaptureWebsiteResult> {
  const page = await openCapturePage(browser, url);
  try {
    page.setDefaultTimeout(EVALUATE_TIMEOUT_MS);
    await captureIframesRecursively(page, browser);
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
