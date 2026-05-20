import type { Page } from "puppeteer";

export const inlineCaptureScript = String.raw`(async ()=>{const blobToDataUri=(blob)=>new Promise((resolve)=>{const reader=new FileReader();reader.onloadend=()=>resolve(reader.result);reader.readAsDataURL(blob);});const fetchAsDataUri=async(resourceUrl)=>{const response=await fetch(resourceUrl);if(!response.ok)return null;return blobToDataUri(await response.blob());};const inlineCssUrls=async(cssText,baseUrl,regex,includeFormat)=>{let updatedCss=cssText;for(const match of cssText.matchAll(regex)){if(match[1].startsWith("data:"))continue;try{const dataUri=await fetchAsDataUri(new URL(match[1],baseUrl).href);if(!dataUri)continue;const replacement=includeFormat?'url("'+dataUri+'") format("'+match[2]+'")':'url("'+dataUri+'")';updatedCss=updatedCss.replace(match[0],replacement);}catch{}}return updatedCss;};const inlineFontUrls=async(cssText,baseUrl)=>{let updatedCss=cssText;for(const faceMatch of cssText.matchAll(/@font-face\s*\{[^}]*\}/gi)){let faceBlock=faceMatch[0];faceBlock=await inlineCssUrls(faceBlock,baseUrl,/url\(["']?([^"')]+?)["']?\)\s*format\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\)/gi,true);faceBlock=await inlineCssUrls(faceBlock,baseUrl,/url\(["']?([^"')]+\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\)/gi,false);updatedCss=updatedCss.replace(faceMatch[0],faceBlock);}return updatedCss;};const cssomSnapshot=[];for(let si=0;si<document.styleSheets.length;si++){try{const sheet=document.styleSheets[si];if(sheet.cssRules&&sheet.cssRules.length>0){const rules=[];for(let i=0;i<sheet.cssRules.length;i++)rules.push(sheet.cssRules[i].cssText);cssomSnapshot.push({href:sheet.href||null,rules});}}catch{}}if(document.adoptedStyleSheets){for(const adopted of document.adoptedStyleSheets){try{if(adopted.cssRules&&adopted.cssRules.length>0){const rules=[];for(let i=0;i<adopted.cssRules.length;i++)rules.push(adopted.cssRules[i].cssText);cssomSnapshot.push({href:null,rules,adopted:true});}}catch{}}}document.querySelectorAll("script").forEach((script)=>script.remove());document.querySelectorAll('link[rel="stylesheet"]').forEach((l)=>l.remove());document.querySelectorAll("style").forEach((s)=>s.remove());for(const snap of cssomSnapshot){if(snap.rules.length===0)continue;const style=document.createElement("style");if(snap.adopted)style.setAttribute("data-adopted-stylesheet","true");if(snap.href)style.setAttribute("data-original-href",snap.href);style.textContent=snap.rules.join("\n");document.head.appendChild(style);}for(const style of document.querySelectorAll("style")){const baseUrl=style.getAttribute("data-original-href")||document.baseURI;style.textContent=await inlineFontUrls(style.textContent||"",baseUrl);}for(const img of document.querySelectorAll("img")){try{const canvas=document.createElement("canvas");canvas.width=img.naturalWidth||img.width||300;canvas.height=img.naturalHeight||img.height||200;const context=canvas.getContext("2d");if(context&&img.complete&&img.naturalWidth>0){context.drawImage(img,0,0);img.src=canvas.toDataURL("image/png");img.removeAttribute("srcset");if(img.parentElement&&img.parentElement.tagName==="PICTURE"){img.parentElement.querySelectorAll("source").forEach(function(s){s.remove()});}}}catch{}}document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((element)=>element.remove());const commentWalker=document.createTreeWalker(document,NodeFilter.SHOW_COMMENT);const comments=[];while(commentWalker.nextNode())comments.push(commentWalker.currentNode);comments.forEach((comment)=>comment.remove());const textWalker=document.createTreeWalker(document,NodeFilter.SHOW_TEXT);const textNodes=[];while(textWalker.nextNode())textNodes.push(textWalker.currentNode);textNodes.forEach((textNode)=>{if(!textNode.textContent||!/^\s+$/.test(textNode.textContent))return;let ancestor=textNode.parentElement;while(ancestor){if(ancestor.tagName==="PRE")return;ancestor=ancestor.parentElement;}textNode.textContent="\n";});return document.documentElement.outerHTML;})()`;

const replaceCapturedIframeHelperSource = String.raw`const iframes=document.querySelectorAll("iframe");const iframe=iframes[params.iframeIndex];if(!iframe)return;const parser=new DOMParser();const doc=parser.parseFromString(params.capturedHtml,"text/html");const container=document.createElement("div");container.setAttribute("data-iframe-inline",params.scopeId);container.setAttribute("data-iframe-src",iframe.getAttribute("src")||"");const width=iframe.getAttribute("width")||iframe.style.width||"100%";const height=iframe.getAttribute("height")||iframe.style.height||"auto";container.style.width=typeof width==="string"&&width.includes("%")?width:width+"px";container.style.height=height==="auto"||(typeof height==="string"&&height.includes("%"))?height:height+"px";container.style.overflow="hidden";container.style.position="relative";const scopeSelector='[data-iframe-inline="'+params.scopeId+'"]';for(const style of doc.querySelectorAll("style")){let css=style.textContent||"";css=css.replace(/([^{}]+)\{/g,(match,selectors)=>{if(selectors.trim().startsWith("@"))return match;const scopedSelectors=selectors.split(",").map((selector)=>{const trimmed=selector.trim();if(!trimmed)return selector;if(trimmed==="html"||trimmed==="body"||trimmed===":root")return scopeSelector;return scopeSelector+" "+trimmed;}).join(",");return scopedSelectors+"{";});const scopedStyle=document.createElement("style");scopedStyle.textContent=css;container.appendChild(scopedStyle);}const contentWrapper=document.createElement("div");contentWrapper.innerHTML=doc.body?doc.body.innerHTML:doc.documentElement.innerHTML;container.appendChild(contentWrapper);iframe.replaceWith(container);`;

export type IframeData = { index: number; src: string };
export type ReplaceIframeParams = { iframeIndex: number; capturedHtml: string; scopeId: string };

export async function getIframeData(page: Page): Promise<IframeData[]> {
  return page.evaluate(() => {
    const data: IframeData[] = [];
    document.querySelectorAll("iframe").forEach((iframe, index) => {
      const src = iframe.getAttribute("src") || iframe.src;
      if (src && src !== "about:blank" && !src.startsWith("javascript:") && !src.startsWith("data:")) {
        data.push({ index, src });
      }
    });
    return data;
  });
}

export async function resolveIframeUrl(page: Page, src: string): Promise<string> {
  return page.evaluate((candidate: string) => {
    try {
      return new URL(candidate, document.baseURI).href;
    } catch {
      return candidate;
    }
  }, src);
}

export async function replaceCapturedIframe(page: Page, params: ReplaceIframeParams): Promise<void> {
  await page.evaluate(({ helperSource, iframeParams }) => {
    const replaceIframe = new Function("params", helperSource) as (args: typeof iframeParams) => void;
    replaceIframe(iframeParams);
  }, { helperSource: replaceCapturedIframeHelperSource, iframeParams: params });
}

export async function replaceIframeWithPlaceholder(page: Page, iframeIndex: number): Promise<void> {
  await page.evaluate((index: number) => {
    const iframe = document.querySelectorAll("iframe")[index];
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

export function buildScopeId(depth: number, index: number): string {
  return `iframe-inline-${depth}-${index}`;
}
