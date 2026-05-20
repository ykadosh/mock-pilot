import type { WebContents, WebFrameMain } from "electron";

export type FrameCapture = { executeJavaScript: (code: string) => Promise<unknown>; url: string };
export type CapturedIframe = { url: string; html: string; childIframeSrcs: string[] };

export const IFRAME_SRCS_SCRIPT = String.raw`(function(){var srcs=[];document.querySelectorAll("iframe").forEach(function(frame){var src=frame.src||frame.getAttribute("src")||"";if(src)srcs.push(src);});return srcs;})()`;
export const FRAME_CAPTURE_SCRIPT = String.raw`(async function(){var cssomSnapshot=[];for(var si=0;si<document.styleSheets.length;si++){try{var sheet=document.styleSheets[si];if(sheet.cssRules&&sheet.cssRules.length>0){var rules=[];for(var ri=0;ri<sheet.cssRules.length;ri++)rules.push(sheet.cssRules[ri].cssText);cssomSnapshot.push({href:sheet.href||null,rules:rules});}}catch(e){}}if(document.adoptedStyleSheets&&document.adoptedStyleSheets.length>0){for(var ai=0;ai<document.adoptedStyleSheets.length;ai++){try{var adopted=document.adoptedStyleSheets[ai];if(adopted.cssRules&&adopted.cssRules.length>0){var adoptedRules=[];for(var ari=0;ari<adopted.cssRules.length;ari++)adoptedRules.push(adopted.cssRules[ari].cssText);cssomSnapshot.push({href:null,rules:adoptedRules,adopted:true});}}catch(e){}}}var images=document.querySelectorAll("img");for(var j=0;j<images.length;j++){try{var img=images[j];if(!img.complete||img.naturalWidth===0)continue;var canvas=document.createElement("canvas");canvas.width=img.naturalWidth||img.width||300;canvas.height=img.naturalHeight||img.height||200;var context=canvas.getContext("2d");if(context){context.drawImage(img,0,0);img.src=canvas.toDataURL("image/png");img.removeAttribute("srcset");}}catch(error){}}document.querySelectorAll("script").forEach(function(script){script.remove();});document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="modulepreload"], link[rel="icon"]').forEach(function(link){link.remove();});document.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(element){element.remove();});document.querySelectorAll('div, section, aside, p, span').forEach(function(element){if(element.textContent&&element.textContent.indexOf('Do not enter passwords')>=0&&element.textContent.indexOf('CodePen')>=0){element.remove();}});document.querySelectorAll('link[rel="stylesheet"]').forEach(function(l){l.remove();});document.querySelectorAll("style").forEach(function(s){s.remove();});for(var ssi=0;ssi<cssomSnapshot.length;ssi++){var snap=cssomSnapshot[ssi];if(snap.rules.length===0)continue;var style=document.createElement("style");if(snap.adopted)style.setAttribute("data-adopted-stylesheet","true");if(snap.href)style.setAttribute("data-original-href",snap.href);style.textContent=snap.rules.join("\n");document.head.appendChild(style);}return document.documentElement.outerHTML;})()`;

export function collectChildFramesRecursively(frame: WebFrameMain, frames: WebFrameMain[]): void {
  for (const child of frame.frames) {
    frames.push(child);
    collectChildFramesRecursively(child, frames);
  }
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function getIframeSrcs(executeJavaScript: (code: string) => Promise<unknown>): Promise<string[]> {
  try {
    return normalizeStringArray(await executeJavaScript(IFRAME_SRCS_SCRIPT));
  } catch {
    /* empty */
    return [];
  }
}

export function matchesKnownIframeUrl(otherUrl: string, knownIframeSrcs: string[]): boolean {
  for (const src of knownIframeSrcs) {
    try {
      const sourceUrl = new URL(src);
      const targetUrl = new URL(otherUrl);
      if (src === otherUrl || sourceUrl.pathname === targetUrl.pathname) return true;
    } catch {
      /* empty */
    }
  }
  return false;
}

export function matchesKnownIframeHost(candidate: WebContents, otherUrl: string, knownIframeSrcs: string[]): boolean {
  if (candidate.getType() !== "webview" && candidate.getType() !== "browserView") return false;
  try {
    const host = new URL(otherUrl).hostname;
    return knownIframeSrcs.some((src) => {
      try {
        return new URL(src).hostname === host;
      } catch {
        /* empty */
        return false;
      }
    });
  } catch {
    /* empty */
    return false;
  }
}

export async function executeFrameCapture(frame: FrameCapture): Promise<string> {
  const result = await frame.executeJavaScript(FRAME_CAPTURE_SCRIPT);
  return typeof result === "string" ? result : "";
}
