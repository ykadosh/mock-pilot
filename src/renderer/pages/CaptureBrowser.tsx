import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setCapturedHtml } from "../lib/store";
import type { CaptureStep } from "../components/CaptureProgressModal";
import { CaptureProgressModal } from "../components/CaptureProgressModal";

type HeightMode = "convert-vh" | "remove" | "keep-as-is";

const CAPTURE_STEPS: { key: string; label: string }[] = [
  { key: "stylesheets", label: "Fetching style sheets" },
  { key: "images", label: "Downloading images" },
  { key: "scripts", label: "Cleaning up the page" },
  { key: "cssom", label: "Processing styles" },
  { key: "fonts", label: "Converting fonts" },
  { key: "layout", label: "Adjusting layout" },
  { key: "cleanup", label: "Tidying up the HTML" },
  { key: "assets", label: "Extracting assets" },
  { key: "screenshot", label: "Creating preview" },
  { key: "format", label: "Formatting the code" },
  { key: "save", label: "Saving your project" },
];

export function CaptureBrowser() {
  const navigate = useNavigate();
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const [addressBarValue, setAddressBarValue] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [pendingUrl, setPendingUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [webviewPreloadPath, setWebviewPreloadPath] = useState("");
  const [captureSettingsOpen, setCaptureSettingsOpen] = useState(false);
  const [heightMode, setHeightMode] = useState<HeightMode>("convert-vh");
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [captureSteps, setCaptureSteps] = useState<CaptureStep[]>([]);
  const [capturePercent, setCapturePercent] = useState(0);
  const abortCaptureRef = useRef(false);

  // Fetch the webview preload path on mount
  useEffect(() => {
    window.api.getWebviewPreloadPath().then(setWebviewPreloadPath);
  }, []);

  // Sync webview navigation state
  const updateNavState = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      setCanGoBack(wv.canGoBack());
      setCanGoForward(wv.canGoForward());
    } catch {
      // webview not ready
    }
  }, []);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onStartLoading = () => setIsLoading(true);
    const onStopLoading = () => {
      setIsLoading(false);
      updateNavState();
    };
    const onNavigate = (e: Electron.DidNavigateEvent) => {
      setCurrentUrl(e.url);
      setAddressBarValue(e.url);
      setIsSecure(e.url.startsWith("https://"));
      updateNavState();
    };
    const onNavigateInPage = (e: Electron.DidNavigateInPageEvent) => {
      setCurrentUrl(e.url);
      setAddressBarValue(e.url);
      setIsSecure(e.url.startsWith("https://"));
      updateNavState();
    };

    wv.addEventListener("did-start-loading", onStartLoading);
    wv.addEventListener("did-stop-loading", onStopLoading);
    wv.addEventListener("did-navigate", onNavigate);
    wv.addEventListener("did-navigate-in-page", onNavigateInPage);

    return () => {
      wv.removeEventListener("did-start-loading", onStartLoading);
      wv.removeEventListener("did-stop-loading", onStopLoading);
      wv.removeEventListener("did-navigate", onNavigate);
      wv.removeEventListener("did-navigate-in-page", onNavigateInPage);
    };
  }, [hasNavigated, updateNavState]);

  const normalizeUrl = (input: string): string => {
    let url = input.trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    return url;
  };

  const navigateTo = (input: string) => {
    const url = normalizeUrl(input);
    if (!url) return;
    setCurrentUrl(url);
    setAddressBarValue(url);
    setIsSecure(url.startsWith("https://"));
    if (!hasNavigated) {
      // Webview isn't in the DOM yet — store URL and mount it
      setPendingUrl(url);
      setHasNavigated(true);
    } else {
      const wv = webviewRef.current;
      if (wv) wv.src = url;
    }
  };

  const handleAddressBarKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      navigateTo(addressBarValue);
    }
  };

  const handleBack = () => webviewRef.current?.goBack();
  const handleForward = () => webviewRef.current?.goForward();
  const handleRefresh = () => {
    if (isLoading) {
      webviewRef.current?.stop();
    } else {
      webviewRef.current?.reload();
    }
  };

  const handleCapture = async () => {
    const wv = webviewRef.current;
    if (!wv || !currentUrl) return;

    const log = (...args: unknown[]) => window.api.captureLog(...args);

    // Refocus the webview immediately so the page doesn't see a blur
    wv.focus();

    // Initialize progress state
    abortCaptureRef.current = false;
    const initialSteps = CAPTURE_STEPS.map(s => ({ label: s.label, status: "waiting" as const }));
    setCaptureSteps(initialSteps);
    setCapturePercent(0);

    const advanceStep = (stepKey: string) => {
      setCaptureSteps(prev => {
        const stepIndex = CAPTURE_STEPS.findIndex(s => s.key === stepKey);
        if (stepIndex === -1) return prev;
        return prev.map((s, i) => ({
          ...s,
          status: i < stepIndex ? "done" : i === stepIndex ? "in-progress" : s.status === "done" ? "done" : "waiting",
        }));
      });
      const stepIndex = CAPTURE_STEPS.findIndex(s => s.key === stepKey);
      if (stepIndex >= 0) {
        setCapturePercent(Math.round((stepIndex / CAPTURE_STEPS.length) * 100));
      }
    };

    // Forward webview console.log to the terminal during capture
    const onConsoleMessage = (e: Electron.ConsoleMessageEvent) => {
      if (e.message.startsWith("[Capture]")) {
        const msg = e.message.slice(10);
        log(msg);
        // Parse step markers
        const stepMatch = msg.match(/\[step:(\w+)\]/);
        if (stepMatch) {
          advanceStep(stepMatch[1]);
        }
      }
    };
    wv.addEventListener("console-message", onConsoleMessage);

    setIsCapturing(true);
    try {
      log("Starting capture for", currentUrl);

      // Capture and inline iframes before the main capture script.
      // We use Electron's webFrameMain API via the main process to access
      // the already-loaded iframe content directly — no Puppeteer, no bot detection.
      advanceStep("stylesheets"); // reuse first step for iframe processing
      log("Checking for iframes to inline...");

      // Get the webview's webContentsId to access its frames from the main process
      const wcId: number | undefined = (wv as unknown as { getWebContentsId?: () => number }).getWebContentsId?.();

      // Get iframe info from the DOM (src and index for matching)
      const iframeData: { src: string; index: number }[] = await wv.executeJavaScript(`
        (function() {
          var iframes = document.querySelectorAll("iframe");
          var data = [];
          iframes.forEach(function(iframe, index) {
            var src = iframe.getAttribute("src") || iframe.src;
            if (src && src !== "about:blank" && src.indexOf("javascript:") !== 0 && src.indexOf("data:") !== 0) {
              try { src = new URL(src, document.baseURI).href; } catch(e) {}
              data.push({ src: src, index: index });
            }
          });
          return data;
        })()
      `);

      if (iframeData.length > 0) {
        log(`Found ${iframeData.length} iframe(s) to capture`);

        // Use the webContentsId to capture iframe content via Electron's frame API
        const capturedFrames = wcId
          ? await window.api.captureWebviewIframes(wcId)
          : { success: false, error: "Could not get webContentsId" };

        if (capturedFrames.success && capturedFrames.iframes && capturedFrames.iframes.length > 0) {
          log(`Captured ${capturedFrames.iframes.length} frame(s) via webFrameMain`);

          // Helper: find a captured frame matching a given URL
          const findFrame = (url: string) => {
            return capturedFrames.iframes!.find(f => {
              const normalize = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "");
              return normalize(f.url) === normalize(url) || f.url.includes(url) || url.includes(f.url);
            });
          };

          // Replace iframes in the webview DOM. We pass ALL captured frames as JSON
          // so the injection script can recursively replace nested iframes too.
          // Also map child iframe src URLs to their captured content for nested matching.
          const frameMap: Record<string, string> = {};
          for (const f of capturedFrames.iframes) {
            frameMap[f.url] = f.html;
            frameMap[f.url.replace(/[#?].*$/, "").replace(/\/+$/, "")] = f.html;
            // Map child iframe src URLs to their webFrameMain-captured content
            // This helps match nested iframes where the src in HTML differs from the frame URL
            if (f.childIframeSrcs) {
              for (const childSrc of f.childIframeSrcs) {
                if (childSrc) {
                  // Find the captured frame whose URL matches this child src
                  const childFrame = capturedFrames.iframes!.find(cf => {
                    const normalize = (u: string) => u.replace(/[#?].*$/, "").replace(/\/+$/, "");
                    if (cf.url === f.url) return false;
                    if (normalize(cf.url) === normalize(childSrc)) return true;
                    if (cf.url.includes(childSrc) || childSrc.includes(cf.url)) return true;
                    // Path-based match (handles domain redirects like codepen.io -> cdpn.io)
                    try {
                      const srcPath = new URL(childSrc).pathname.replace(/\/+$/, "");
                      const cfPath = new URL(cf.url).pathname.replace(/\/+$/, "");
                      if (srcPath === cfPath && srcPath.length > 1) return true;
                    } catch { /* ignore */ }
                    return false;
                  });
                  if (childFrame) {
                    frameMap[childSrc] = childFrame.html;
                    frameMap[childSrc.replace(/[#?].*$/, "").replace(/\/+$/, "")] = childFrame.html;
                  }
                }
              }
            }
          }
          const capturedMap = JSON.stringify(frameMap);

          // Inject all captured frames at once and handle recursive replacement
          await wv.executeJavaScript(`
            (function() {
              var capturedMap = ${capturedMap};

              function findCapturedHtml(src) {
                if (capturedMap[src]) return capturedMap[src];
                // Try normalized
                var normalized = src.replace(/[#?].*$/, "").replace(/\\/+$/, "");
                if (capturedMap[normalized]) return capturedMap[normalized];
                // Try partial match (substring)
                var keys = Object.keys(capturedMap);
                for (var i = 0; i < keys.length; i++) {
                  if (keys[i].indexOf(src) >= 0 || src.indexOf(keys[i]) >= 0) return capturedMap[keys[i]];
                }
                // Try path-based match (handles domain redirects like codepen.io -> cdpn.io)
                try {
                  var srcUrl = new URL(src);
                  var srcPath = srcUrl.pathname.replace(/\\/+$/, "");
                  for (var j = 0; j < keys.length; j++) {
                    try {
                      var keyUrl = new URL(keys[j]);
                      var keyPath = keyUrl.pathname.replace(/\\/+$/, "");
                      if (srcPath === keyPath && srcPath.length > 1) return capturedMap[keys[j]];
                    } catch(e2) {}
                  }
                } catch(e) {}
                return null;
              }

              function replaceIframe(iframe, scopeId) {
                var src = iframe.getAttribute("src") || iframe.src;
                try { src = new URL(src, document.baseURI).href; } catch(e) {}

                var capturedHtml = findCapturedHtml(src);
                if (!capturedHtml) return false;

                var doc = new DOMParser().parseFromString(capturedHtml, "text/html");

                // Remove trust/security warning banners from captured content
                doc.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(el) { el.remove(); });
                doc.querySelectorAll('div, section, aside, p, span').forEach(function(el) {
                  if (el.textContent && el.textContent.indexOf('Do not enter passwords') >= 0 && el.textContent.indexOf('CodePen') >= 0) {
                    el.remove();
                  }
                });

                // Recursively replace any nested iframes in the parsed doc
                // Use the iframe's src as base URL for resolving relative URLs in nested iframes
                var nestedIframes = doc.querySelectorAll("iframe");
                for (var ni = nestedIframes.length - 1; ni >= 0; ni--) {
                  replaceIframeInDoc(doc, nestedIframes[ni], scopeId + "-" + ni, src);
                }

                var container = document.createElement("div");
                container.setAttribute("data-iframe-inline", scopeId);
                container.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");

                var width = iframe.getAttribute("width") || iframe.style.width || "100%";
                var height = iframe.getAttribute("height") || iframe.style.height || "auto";
                container.style.width = (typeof width === "string" && width.indexOf("%") >= 0) ? width : width + "px";
                container.style.height = height === "auto" ? "auto" : (typeof height === "string" && height.indexOf("%") >= 0) ? height : height + "px";
                container.style.overflow = "hidden";
                container.style.position = "relative";

                // Scope and inject iframe CSS
                var scopeSelector = '[data-iframe-inline="' + scopeId + '"]';
                var iframeStyles = doc.querySelectorAll("style");
                for (var si = 0; si < iframeStyles.length; si++) {
                  var css = iframeStyles[si].textContent || "";
                  css = css.replace(/([^{}]+)\\{/g, function(match, selectors) {
                    if (selectors.trim().charAt(0) === "@") return match;
                    var parts = selectors.split(",").map(function(sel) {
                      var trimmed = sel.trim();
                      if (!trimmed) return sel;
                      if (trimmed === "html" || trimmed === "body" || trimmed === ":root") return scopeSelector;
                      return scopeSelector + " " + trimmed;
                    });
                    return parts.join(",") + "{";
                  });
                  var scopedStyle = document.createElement("style");
                  scopedStyle.textContent = css;
                  container.appendChild(scopedStyle);
                }

                var bodyContent = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
                var contentWrapper = document.createElement("div");
                contentWrapper.style.height = "100%";
                contentWrapper.style.width = "100%";
                contentWrapper.innerHTML = bodyContent;
                // Copy body-level classes and styles so layout CSS still applies
                if (doc.body) {
                  contentWrapper.className = doc.body.className;
                  var bodyStyle = doc.body.getAttribute("style");
                  if (bodyStyle) contentWrapper.setAttribute("style", "height:100%;width:100%;" + bodyStyle);
                }
                container.appendChild(contentWrapper);

                iframe.replaceWith(container);
                return true;
              }

              function replaceIframeInDoc(doc, iframe, scopeId, parentUrl) {
                var src = iframe.getAttribute("src") || iframe.getAttribute("data-src") || "";
                // Resolve relative URL against the PARENT iframe's URL, not the page's baseURI
                try { src = new URL(src, parentUrl || document.baseURI).href; } catch(e) {}

                var capturedHtml = findCapturedHtml(src);
                if (!capturedHtml) {
                  // No matching captured content — remove the iframe
                  iframe.remove();
                  return;
                }

                var innerDoc = new DOMParser().parseFromString(capturedHtml, "text/html");

                // Remove trust/security warnings
                innerDoc.querySelectorAll('#trust-warning, .trust-warning, [class*="trust-warning"], [class*="embed-warning"], #embed-trust, [class*="TrustWarning"], [data-testid*="trust"]').forEach(function(el) { el.remove(); });
                innerDoc.querySelectorAll('div, section, aside, p, span').forEach(function(el) {
                  if (el.textContent && el.textContent.indexOf('Do not enter passwords') >= 0 && el.textContent.indexOf('CodePen') >= 0) {
                    el.remove();
                  }
                });

                var container = doc.createElement("div");
                container.setAttribute("data-iframe-inline", scopeId);
                container.style.width = iframe.getAttribute("width") || iframe.style.width || "100%";
                container.style.height = iframe.getAttribute("height") || iframe.style.height || "100%";
                container.style.overflow = "hidden";

                // Add styles from nested iframe
                var styles = innerDoc.querySelectorAll("style");
                var nestedScope = '[data-iframe-inline="' + scopeId + '"]';
                for (var si = 0; si < styles.length; si++) {
                  var css = styles[si].textContent || "";
                  css = css.replace(/([^{}]+)\\{/g, function(match, selectors) {
                    if (selectors.trim().charAt(0) === "@") return match;
                    var parts = selectors.split(",").map(function(sel) {
                      var trimmed = sel.trim();
                      if (!trimmed) return sel;
                      if (trimmed === "html" || trimmed === "body" || trimmed === ":root") return nestedScope;
                      return nestedScope + " " + trimmed;
                    });
                    return parts.join(",") + "{";
                  });
                  var scopedStyle = doc.createElement("style");
                  scopedStyle.textContent = css;
                  container.appendChild(scopedStyle);
                }

                var bodyContent = innerDoc.body ? innerDoc.body.innerHTML : innerDoc.documentElement.innerHTML;
                var wrapper = doc.createElement("div");
                wrapper.style.height = "100%";
                wrapper.style.width = "100%";
                wrapper.innerHTML = bodyContent;
                if (innerDoc.body) {
                  wrapper.className = innerDoc.body.className;
                  var bodyStyle = innerDoc.body.getAttribute("style");
                  if (bodyStyle) wrapper.setAttribute("style", "height:100%;width:100%;" + bodyStyle);
                }
                container.appendChild(wrapper);
                iframe.replaceWith(container);
              }

              // Process all iframes in reverse order
              var iframes = document.querySelectorAll("iframe");
              for (var i = iframes.length - 1; i >= 0; i--) {
                var iframe = iframes[i];
                var src = iframe.getAttribute("src") || iframe.src;
                if (!src || src === "about:blank" || src.indexOf("javascript:") === 0 || src.indexOf("data:") === 0) continue;
                replaceIframe(iframe, "iframe-inline-" + i);
              }
            })()
          `);
          log("Iframe replacement complete");
        } else {
          log("Frame capture failed or returned empty: " + (capturedFrames.error || "no frames"));
          // Fallback: replace all iframes with placeholders
          for (const { index } of [...iframeData].reverse()) {
            await wv.executeJavaScript(`
              (function() {
                var iframe = document.querySelectorAll("iframe")[${index}];
                if (!iframe) return;
                var placeholder = document.createElement("div");
                placeholder.setAttribute("data-iframe-failed", "true");
                placeholder.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");
                placeholder.style.border = "1px dashed #ccc";
                placeholder.style.padding = "1em";
                placeholder.style.textAlign = "center";
                placeholder.style.color = "#999";
                placeholder.textContent = "[iframe content could not be captured]";
                iframe.replaceWith(placeholder);
              })()
            `);
          }
        }
        log("Iframe processing complete");
      } else {
        log("No iframes found");
      }

      // Extract the full HTML from the webview's current state
      log("Injecting capture script into webview...");
      const rawHtml = await wv.executeJavaScript(`
        (async () => {
          var _heightMode = ${JSON.stringify(heightMode)};

          // Shadow fetch with a timeout-aware version to avoid hanging on unresponsive resources
          var _origFetch = window.fetch.bind(window);
          var fetch = function(url, opts) {
            var timeout = 10000;
            var controller = new AbortController();
            var id = setTimeout(function() { controller.abort(); }, timeout);
            var merged = Object.assign({}, opts || {}, { signal: controller.signal });
            return _origFetch(url, merged).finally(function() { clearTimeout(id); });
          };

          var _log = function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift("[Capture]");
            console.log.apply(console, args);
          };

          _log("Capture script running inside webview");

          // Cache for already-fetched font URLs to avoid duplicate requests
          var _fontCache = {};

          async function _fetchFontAsDataUri(resolvedUrl) {
            if (_fontCache[resolvedUrl] !== undefined) return _fontCache[resolvedUrl];
            try {
              var res = await fetch(resolvedUrl);
              if (res.ok) {
                var blob = await res.blob();
                var dataUri = await new Promise(function(resolve) {
                  var reader = new FileReader();
                  reader.onloadend = function() { resolve(reader.result); };
                  reader.readAsDataURL(blob);
                });
                _fontCache[resolvedUrl] = dataUri;
                return dataUri;
              }
            } catch (e) {
              _log("  Font fetch failed: " + resolvedUrl + " - " + (e && e.message || e));
            }
            _fontCache[resolvedUrl] = null;
            return null;
          }

          // Helper: resolve and inline font URLs in CSS text relative to a base URL
          async function inlineFontUrls(cssText, baseUrl) {
            const fontFaceRegex = /@font-face\\s*\\{[^}]*\\}/gi;
            const fontFaces = [...cssText.matchAll(fontFaceRegex)];
            _log("  Found " + fontFaces.length + " @font-face block(s) in CSS (" + cssText.length + " chars)");
            for (const faceMatch of fontFaces) {
              let faceBlock = faceMatch[0];
              const urlRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
              const urlMatches = [...faceBlock.matchAll(urlRegex)];
              for (const match of urlMatches) {
                const fontUrl = match[1];
                if (fontUrl.startsWith("data:")) continue;
                const resolvedUrl = new URL(fontUrl, baseUrl).href;
                const dataUri = await _fetchFontAsDataUri(resolvedUrl);
                if (dataUri) {
                  faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '") format("' + match[2] + '")');
                }
              }
              const simpleUrlRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
              const simpleMatches = [...faceBlock.matchAll(simpleUrlRegex)];
              for (const match of simpleMatches) {
                const fontUrl = match[1];
                if (fontUrl.startsWith("data:")) continue;
                const resolvedUrl = new URL(fontUrl, baseUrl).href;
                const dataUri = await _fetchFontAsDataUri(resolvedUrl);
                if (dataUri) {
                  faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '")');
                }
              }
              cssText = cssText.replace(faceMatch[0], faceBlock);
            }
            return cssText;
          }

          // Inline external stylesheets
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          _log("[step:stylesheets] Inlining " + stylesheets.length + " external stylesheet(s)...");
          for (const link of stylesheets) {
            try {
              const href = link.href;
              _log("  Fetching stylesheet: " + href);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const res = await fetch(href, { signal: controller.signal });
              clearTimeout(timeoutId);
              _log("  Fetched stylesheet (" + res.status + "): " + href);
              let css = await res.text();
              _log("  Inlining fonts for stylesheet: " + href);
              css = await inlineFontUrls(css, href);
              _log("  Done inlining fonts for: " + href);
              const style = document.createElement("style");
              style.textContent = css;
              link.replaceWith(style);
            } catch (e) { _log("  FAILED stylesheet: " + link.href + " - " + (e && e.message || e)); }
          }

          // Convert images to data URIs (before removing scripts, as some images may need JS)
          const images = document.querySelectorAll("img");
          _log("[step:images] Converting " + images.length + " image(s) to data URIs...");

          // Force lazy images to load
          for (const img of images) {
            if (img.loading === "lazy") {
              img.loading = "eager";
            }
          }

          // Wait for images to load (up to 5s total batch)
          await new Promise(resolve => {
            var pending = 0;
            var done = false;
            var timeout = setTimeout(() => { done = true; resolve(undefined); }, 5000);
            for (const img of images) {
              if (img.complete && img.naturalWidth > 0) continue;
              if (!img.src || img.src.startsWith("data:")) continue;
              pending++;
              var check = () => { pending--; if (pending <= 0 && !done) { done = true; clearTimeout(timeout); resolve(undefined); } };
              img.addEventListener("load", check, { once: true });
              img.addEventListener("error", check, { once: true });
            }
            if (pending === 0) { done = true; clearTimeout(timeout); resolve(undefined); }
          });

          for (const img of images) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width || 300;
              canvas.height = img.naturalHeight || img.height || 200;
              const ctx = canvas.getContext("2d");
              if (ctx && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, 0, 0);
                img.src = canvas.toDataURL("image/png");
                // Remove srcset after successful capture to prevent it from being used
                img.removeAttribute("srcset");
              }
            } catch {}
          }
          _log("Done converting images");

          // Capture video poster frames as static images
          const videos = document.querySelectorAll("video");
          _log("[step:videos] Capturing " + videos.length + " video poster frame(s)...");

          // For each video, seek to a small offset and capture the frame
          for (const video of videos) {
            try {
              var replaced = false;

              // Attempt to load and seek the video to get a visible frame
              if (video.src || video.querySelector("source")) {
                // Ensure video is loading
                if (video.readyState < 2) {
                  video.preload = "auto";
                  video.muted = true;
                  video.load();
                  // Wait for loadeddata
                  await new Promise(resolve => {
                    var t = setTimeout(resolve, 3000);
                    video.addEventListener("loadeddata", () => { clearTimeout(t); resolve(undefined); }, { once: true });
                    video.addEventListener("error", () => { clearTimeout(t); resolve(undefined); }, { once: true });
                  });
                }

                // Seek to 0.1s to ensure a frame is decoded
                if (video.readyState >= 2 && video.videoWidth > 0) {
                  video.currentTime = 0.1;
                  await new Promise(resolve => {
                    var t = setTimeout(resolve, 2000);
                    video.addEventListener("seeked", () => { clearTimeout(t); resolve(undefined); }, { once: true });
                  });

                  // Now try to capture
                  const canvas = document.createElement("canvas");
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                    // Verify canvas has actual content
                    var pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    var hasContent = false;
                    for (var pi = 3; pi < pixelData.length; pi += 400) {
                      if (pixelData[pi] > 0) { hasContent = true; break; }
                    }
                    if (hasContent) {
                      const dataUri = canvas.toDataURL("image/jpeg", 0.85);
                      const img = document.createElement("img");
                      img.src = dataUri;
                      img.className = video.className;
                      var vstyle = video.getAttribute("style");
                      if (vstyle) img.setAttribute("style", vstyle);
                      img.setAttribute("alt", "Video poster");
                      video.replaceWith(img);
                      replaced = true;
                    }
                  }
                }
              }

              if (!replaced) {
                if (video.poster) {
                  const img = document.createElement("img");
                  img.src = video.poster;
                  img.className = video.className;
                  var vstyle2 = video.getAttribute("style");
                  if (vstyle2) img.setAttribute("style", vstyle2);
                  img.setAttribute("alt", "Video poster");
                  video.replaceWith(img);
                } else {
                  // Replace with a dark placeholder with play icon
                  const placeholder = document.createElement("div");
                  placeholder.className = video.className;
                  var existingStyle = video.getAttribute("style") || "";
                  placeholder.setAttribute("style", existingStyle + ";background:#1a1a2e;display:flex;align-items:center;justify-content:center;min-height:120px;");
                  placeholder.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
                  video.replaceWith(placeholder);
                }
              }
            } catch (e) { _log("  FAILED video capture: " + (e && e.message || e)); }
          }
          _log("Done capturing video posters");

          // Remove scripts BEFORE CSSOM serialization.
          // This kills MutationObservers (e.g. Griffel) that would react to
          // textContent changes and re-insert rules via insertRule(), causing
          // the serialized CSS to be lost.
          _log("[step:scripts] Removing scripts...");
          document.querySelectorAll("script").forEach((s) => s.remove());

          // Remove preload/prefetch links that would cause ERR_FILE_NOT_FOUND
          document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"], link[rel="modulepreload"], link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());

          // Serialize CSSOM rules into style tag textContent.
          // Frameworks like Fluent UI / Griffel inject CSS via insertRule(),
          // which doesn't appear in outerHTML. We replace textContent with
          // the full set of CSSOM rules for every style tag that has a sheet.
          _log("[step:cssom] Serializing CSSOM rules...");
          var cssomCount = 0;
          document.querySelectorAll("style").forEach(function(style) {
            try {
              var sheet = style.sheet;
              if (sheet && sheet.cssRules && sheet.cssRules.length > 0) {
                var rules = [];
                for (var i = 0; i < sheet.cssRules.length; i++) {
                  rules.push(sheet.cssRules[i].cssText);
                }
                var serialized = rules.join("\\n");
                if (serialized !== (style.textContent || "").trim()) {
                  style.textContent = serialized;
                  cssomCount++;
                }
              }
            } catch (e) { /* cross-origin stylesheet, skip */ }
          });
          _log("Serialized CSSOM rules from " + cssomCount + " style tag(s)");

          // Serialize document.adoptedStyleSheets into <style> tags.
          // Frameworks like Griffel v9 create CSSStyleSheet objects programmatically
          // and add them to document.adoptedStyleSheets. These have no <style> element
          // in the DOM, so outerHTML misses them entirely.
          if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0) {
            _log("Serializing " + document.adoptedStyleSheets.length + " adopted stylesheet(s)...");
            var adoptedCount = 0;
            for (var asi = 0; asi < document.adoptedStyleSheets.length; asi++) {
              try {
                var adoptedSheet = document.adoptedStyleSheets[asi];
                if (adoptedSheet.cssRules && adoptedSheet.cssRules.length > 0) {
                  var adoptedRules = [];
                  for (var ari = 0; ari < adoptedSheet.cssRules.length; ari++) {
                    adoptedRules.push(adoptedSheet.cssRules[ari].cssText);
                  }
                  var adoptedStyle = document.createElement("style");
                  adoptedStyle.setAttribute("data-adopted-stylesheet", "true");
                  adoptedStyle.textContent = adoptedRules.join("\\n");
                  document.head.appendChild(adoptedStyle);
                  adoptedCount++;
                }
              } catch (e) { _log("Error serializing adopted stylesheet: " + e); }
            }
            _log("Serialized " + adoptedCount + " adopted stylesheet(s) into <style> tags");
          }

          // Process existing style tags (only those containing @font-face, in parallel)
          const inlineStyles = [...document.querySelectorAll("style")];
          const fontStyles = inlineStyles.filter(function(s) { return (s.textContent || "").indexOf("@font-face") !== -1; });
          _log("[step:fonts] Processing " + fontStyles.length + " of " + inlineStyles.length + " inline style tag(s) that contain @font-face...");
          await Promise.all(fontStyles.map(async function(style) {
            style.textContent = await inlineFontUrls(style.textContent || "", document.baseURI);
          }));
          _log("Done processing inline style tags");

          // Bake computed dimensions for elements that depend on viewport sizing.
          // Elements using position:absolute with top+bottom derive their height
          // from the viewport, which is lost in a static capture.
          _log("[step:layout] Baking viewport-dependent dimensions...");
          var bakeCount = 0;
          document.querySelectorAll('*').forEach(function(el) {
            var cs = getComputedStyle(el);
            if (el.style.height && el.style.height.endsWith('px')) return;
            var needsBake = false;
            // Absolutely/fixed positioned with both top and bottom set
            if ((cs.position === 'absolute' || cs.position === 'fixed') &&
                cs.top !== 'auto' && cs.bottom !== 'auto') {
              needsBake = true;
            }
            if (needsBake) {
              var rect = el.getBoundingClientRect();
              if (rect.height > 0) {
                el.style.height = rect.height + 'px';
                bakeCount++;
              }
            }
          });
          _log("Baked " + bakeCount + " viewport-dependent dimensions");

          // Handle viewport-derived inline heights set by JavaScript.
          // Sites that poll window.resize and set element.style.height = innerHeight - N
          // freeze at the capture-time viewport size. Detect and fix these.
          if (_heightMode !== 'keep-as-is') {
            _log("Processing viewport-derived heights (mode: " + _heightMode + ")...");
            var vpHeight = window.innerHeight;
            var heightFixCount = 0;
            document.querySelectorAll('*').forEach(function(el) {
              if (!el.style.height || !el.style.height.endsWith('px')) return;
              var h = parseFloat(el.style.height);
              if (isNaN(h) || h <= 0) return;
              // Check if this height + the element's top position ≈ viewport height,
              // meaning the element stretches to near the bottom of the viewport
              var rect = el.getBoundingClientRect();
              var bottomGap = Math.abs((rect.top + h) - vpHeight);
              if (bottomGap < 30 && h > vpHeight * 0.3) {
                var offset = Math.round(rect.top);
                if (_heightMode === 'convert-vh') {
                  el.style.height = offset > 0 ? 'calc(100vh - ' + offset + 'px)' : '100vh';
                } else {
                  el.style.removeProperty('height');
                }
                heightFixCount++;
              }
            });
            _log("Fixed " + heightFixCount + " viewport-derived height(s)");
          }

          // Expand scrollable containers so their full content is visible
          // in the static capture. Find elements with overflow-y: auto/scroll
          // that have hidden overflow content, then expand them.
          _log("Expanding scrollable containers...");
          var expandCount = 0;
          document.querySelectorAll('*').forEach(function(el) {
            var cs = getComputedStyle(el);
            if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
              var extra = el.scrollHeight - el.clientHeight;
              if (extra > 10) {
                el.style.height = el.scrollHeight + 'px';
                el.style.maxHeight = 'none';
                el.style.overflowY = 'visible';
                expandCount++;
              }
            }
          });
          _log("Expanded " + expandCount + " scrollable container(s)");

          // Remove HTML comments
          _log("[step:cleanup] Removing HTML comments...");
          const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
          const comments = [];
          while (walker.nextNode()) comments.push(walker.currentNode);
          comments.forEach((c) => c.remove());

          // Remove hidden elements
          _log("Removing hidden elements...");
          document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => el.remove());

          // Collapse whitespace-only text nodes
          _log("Collapsing whitespace...");
          const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
          textNodes.forEach((t) => {
            if (t.textContent && /^\\s+$/.test(t.textContent)) {
              // Don't collapse whitespace inside <pre> elements — it's significant
              var ancestor = t.parentElement;
              while (ancestor) {
                if (ancestor.tagName === "PRE") return;
                ancestor = ancestor.parentElement;
              }
              t.textContent = "\\n";
            }
          });

          // Flatten nested interactive elements to prevent HTML parser reparenting.
          // The browser's outerHTML can serialize nested <button> elements (created
          // by JS), but re-parsing triggers the parser's "in scope" rules which pop
          // intervening elements, corrupting the DOM hierarchy.
          _log("Flattening nested interactive elements...");
          var flattenCount = 0;
          document.querySelectorAll('button button, a a').forEach(function(inner) {
            var replacement = document.createElement('span');
            replacement.setAttribute('data-mp-tag', inner.tagName.toLowerCase());
            Array.from(inner.attributes).forEach(function(attr) {
              replacement.setAttribute(attr.name, attr.value);
            });
            while (inner.firstChild) replacement.appendChild(inner.firstChild);
            inner.parentNode.replaceChild(replacement, inner);
            flattenCount++;
          });
          if (flattenCount) _log("Flattened " + flattenCount + " nested interactive element(s)");

          // Embed the viewport dimensions so the preview iframe can size itself correctly
          var vpMeta = document.createElement('meta');
          vpMeta.name = 'mp-viewport-height';
          vpMeta.content = String(window.innerHeight);
          document.head.appendChild(vpMeta);

          _log("Capture script complete, returning HTML (" + document.documentElement.outerHTML.length + " chars)");
          return document.documentElement.outerHTML;
        })()
      `);

      log("Webview script finished, got", rawHtml.length, "chars of HTML");

      if (abortCaptureRef.current) throw new Error("Capture cancelled");

      // Extract typography and color assets from the page
      advanceStep("assets");
      log("Extracting assets (typography & colors)...");
      const extractedAssets = await wv.executeJavaScript(`
        (function() {
          var typographyMap = {};
          var colorSet = { text: {}, background: {}, border: {} };

          // Helper to convert rgb/rgba to hex
          function rgbToHex(rgb) {
            if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return null;
            var match = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
            if (!match) return rgb.startsWith("#") ? rgb.toLowerCase() : null;
            var r = parseInt(match[1]), g = parseInt(match[2]), b = parseInt(match[3]);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          }

          // Walk all elements
          var allElements = document.querySelectorAll("*");
          for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var cs = getComputedStyle(el);

            // Skip invisible elements
            if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;

            // Extract colors
            var textColor = rgbToHex(cs.color);
            if (textColor) colorSet.text[textColor] = true;

            var bgColor = rgbToHex(cs.backgroundColor);
            if (bgColor) colorSet.background[bgColor] = true;

            var borderColor = rgbToHex(cs.borderColor);
            if (borderColor && cs.borderWidth !== "0px") colorSet.border[borderColor] = true;

            // Extract typography only from elements with text content
            if (!el.textContent || !el.textContent.trim()) continue;
            // Only consider elements that directly contain text (not just children)
            var hasDirectText = false;
            for (var c = 0; c < el.childNodes.length; c++) {
              if (el.childNodes[c].nodeType === 3 && el.childNodes[c].textContent.trim()) {
                hasDirectText = true;
                break;
              }
            }
            if (!hasDirectText) continue;

            var key = cs.fontFamily.toLowerCase() + "|" + cs.fontSize + "|" + cs.fontWeight + "|" + cs.fontStyle + "|" + cs.letterSpacing + "|" + cs.textTransform;
            if (!typographyMap[key]) {
              typographyMap[key] = {
                fontFamily: cs.fontFamily,
                fontSize: cs.fontSize,
                fontWeight: cs.fontWeight,
                fontStyle: cs.fontStyle,
                lineHeight: cs.lineHeight,
                letterSpacing: cs.letterSpacing,
                textTransform: cs.textTransform
              };
            }
          }

          // Build results
          var typography = Object.values(typographyMap);
          // Deduplicate colors across all contexts into a single unique set
          var uniqueColors = {};
          Object.keys(colorSet.text).forEach(function(c) { uniqueColors[c] = true; });
          Object.keys(colorSet.background).forEach(function(c) { uniqueColors[c] = true; });
          Object.keys(colorSet.border).forEach(function(c) { uniqueColors[c] = true; });
          var colors = Object.keys(uniqueColors).map(function(c) { return { value: c }; });

          return { typography: typography, colors: colors };
        })()
      `);
      log("Extracted " + extractedAssets.typography.length + " typography styles and " + extractedAssets.colors.length + " colors");

      if (abortCaptureRef.current) throw new Error("Capture cancelled");

      // Scroll to top and take a screenshot from the webview
      advanceStep("screenshot");
      log("Taking screenshot...");
      await wv.executeJavaScript("window.scrollTo(0, 0)");
      await new Promise(resolve => setTimeout(resolve, 100));
      const nativeImage = await wv.capturePage();
      const thumbnailDataUrl = nativeImage.toDataURL();

      if (abortCaptureRef.current) throw new Error("Capture cancelled");

      // Format the HTML via main process
      advanceStep("format");
      log("Formatting HTML...");
      const formatResult = await window.api.formatHtml(rawHtml);
      if (!formatResult.success || !formatResult.html) {
        throw new Error(formatResult.error || "Failed to format HTML");
      }
      log("HTML formatted successfully");

      if (abortCaptureRef.current) throw new Error("Capture cancelled");

      // Use the website's title, falling back to the URL hostname
      let title: string;
      try {
        const wv = webviewRef.current;
        const pageTitle = wv?.getTitle?.();
        title = pageTitle && pageTitle.trim() ? pageTitle.trim() : new URL(currentUrl).hostname.replace(/^www\./, "");
      } catch {
        title = currentUrl;
      }

      // Save the project
      advanceStep("save");
      log("Saving project...");
      const project = await window.api.saveProject({
        url: currentUrl,
        title,
        html: formatResult.html,
        thumbnail: thumbnailDataUrl,
      });
      log("Project saved:", project.id);

      // Save extracted assets
      if (extractedAssets) {
        const assetsToSave = {
          typography: extractedAssets.typography.map((t: { fontFamily: string; fontSize: string; fontWeight: string; fontStyle: string; lineHeight: string; letterSpacing: string; textTransform: string }, i: number) => ({
            id: "typo-" + i,
            label: t.fontFamily.split(",")[0].replace(/['"]/g, "").trim() + " " + t.fontSize + " " + t.fontWeight,
            ...t,
          })),
          colors: extractedAssets.colors.map((c: { value: string }, i: number) => ({
            id: "color-" + i,
            label: "",
            value: c.value,
          })),
        };
        await window.api.saveProjectAssets(project.id, assetsToSave);
        log("Assets saved:", assetsToSave.typography.length, "typography,", assetsToSave.colors.length, "colors");
      }

      // Mark all steps done
      setCaptureSteps(prev => prev.map(s => ({ ...s, status: "done" as const })));
      setCapturePercent(100);

      setCapturedHtml(formatResult.html, "mp-asset://assets/");
      navigate(`/editor/${project.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "Capture cancelled") {
        log("Capture cancelled by user");
      } else {
        log("Capture FAILED:", msg);
        console.error("Capture failed:", err);
        alert(msg || "Failed to capture website state");
      }
    } finally {
      wv.removeEventListener("console-message", onConsoleMessage);
      setIsCapturing(false);
    }
  };

  // Prevent clicks outside the webview from stealing focus,
  // which would close menus/dropdowns inside the browsed website.
  // We exclude the address bar input so the user can still type in it.
  const preventFocusSteal = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT") return;
    e.preventDefault();
  };

  // When any element outside the webview receives focus, immediately
  // push focus back to the webview. This minimizes the blur window
  // so menus/dropdowns inside the page don't have time to close.
  useEffect(() => {
    if (!hasNavigated) return;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Allow the address bar to receive focus
      if (target.tagName === "INPUT") return;
      const wv = webviewRef.current;
      if (wv && document.contains(wv)) {
        wv.focus();
      }
    };
    window.addEventListener("focusin", onFocusIn);
    return () => window.removeEventListener("focusin", onFocusIn);
  }, [hasNavigated]);

  // Close capture settings modal on Escape
  useEffect(() => {
    if (!captureSettingsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCaptureSettingsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [captureSettingsOpen]);

  return (
    <div className="bg-background text-on-surface font-body-main flex h-screen flex-col overflow-hidden antialiased">
      {/* Top Nav Bar */}
      <header onMouseDown={preventFocusSteal} className="z-50 flex h-12 w-full items-center justify-between border-b border-slate-700 bg-slate-900 pr-4 pl-20 [-webkit-app-region:drag]">
        <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
          <span
            onClick={() => navigate("/")}
            className="font-headline-md cursor-pointer text-lg font-bold tracking-tighter text-slate-50"
          >
            MockPilot
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <span className="font-ui-small text-slate-400">Capture Browser</span>
        </div>
        <div className="gap-md flex items-center [-webkit-app-region:no-drag]">
          <button
            onClick={() => navigate("/")}
            className="font-ui-small gap-xs flex cursor-pointer items-center text-slate-400 transition-colors hover:text-white"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Cancel
          </button>
        </div>
      </header>

      {/* Browser Controls Bar */}
      <section onMouseDown={preventFocusSteal} className="bg-surface-container-low gap-md border-outline-variant flex h-14 shrink-0 items-center border-b px-4">
        {/* Navigation buttons */}
        <div className="gap-xs flex items-center">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="text-on-surface-variant hover:bg-surface-container-highest flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-default disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="text-on-surface-variant hover:bg-surface-container-highest flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-default disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={!hasNavigated}
            className="text-on-surface-variant hover:bg-surface-container-highest flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-default disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isLoading ? "close" : "refresh"}
            </span>
          </button>
        </div>

        {/* Address bar */}
        <div className="bg-surface-container-lowest border-outline-variant gap-sm flex h-9 flex-1 items-center rounded border px-3">
          {isSecure && (
            <span className="material-symbols-outlined text-primary text-[16px]">lock</span>
          )}
          <input
            type="text"
            value={addressBarValue}
            onChange={(e) => setAddressBarValue(e.target.value)}
            onKeyDown={handleAddressBarKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Enter a URL and press Enter"
            className="text-ui-small text-on-surface-variant font-code-block w-full border-none bg-transparent p-0 focus:ring-0 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Capture settings + button */}
        <div className="gap-xs relative flex items-center">
          <button
            ref={settingsButtonRef}
            onClick={() => setCaptureSettingsOpen(prev => !prev)}
            className="text-on-surface-variant hover:bg-surface-container-highest flex h-9 w-9 cursor-pointer items-center justify-center rounded transition-colors"
            title="Capture settings"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>

          {/* Settings modal */}
          {captureSettingsOpen && (
            <div
              className="bg-background/60 p-md fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
              onMouseDown={(e) => { if (e.target === e.currentTarget) setCaptureSettingsOpen(false); }}
            >
              <div className="bg-surface-container-high border-outline-variant flex w-[420px] flex-col overflow-hidden rounded border shadow-2xl">
                {/* Modal Header */}
                <div className="px-md py-sm bg-surface-container-highest border-outline-variant flex items-center justify-between border-b">
                  <div className="gap-sm flex items-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>settings_overscan</span>
                    <span className="font-label-caps text-label-caps text-on-surface">Capture Settings</span>
                  </div>
                  <button
                    onClick={() => setCaptureSettingsOpen(false)}
                    className="text-outline hover:text-on-surface cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-md space-y-md max-h-[70vh] overflow-y-auto">
                  <section className="space-y-sm">
                    <div className="border-outline-variant pb-xs flex items-center justify-between border-b">
                      <label className="font-label-caps text-label-caps text-on-surface-variant">Height Handling</label>
                      <span className="group relative cursor-help">
                        <span className="material-symbols-outlined text-outline text-[14px]">info</span>
                        <span className="bg-surface-container-highest border-outline-variant px-sm py-xs text-on-surface-variant pointer-events-none absolute top-full right-0 z-10 mt-1 w-56 rounded border text-[11px] leading-relaxed opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          How to handle JS-set pixel heights that track the viewport.
                        </span>
                      </span>
                    </div>
                    <div className="gap-gutter flex flex-col">
                      {([
                        { value: "convert-vh" as HeightMode, label: "Convert to viewport-relative", desc: "Replace frozen heights with dynamic calc(100vh − …)", icon: "swap_vert" },
                        { value: "remove" as HeightMode, label: "Remove hardcoded heights", desc: "Strip matching heights, let CSS rules take over", icon: "delete_sweep" },
                        { value: "keep-as-is" as HeightMode, label: "Keep original heights", desc: "Preserve pixel values as captured", icon: "lock" },
                      ]).map(opt => (
                        <label
                          key={opt.value}
                          className="p-sm bg-surface-container-lowest border-outline-variant group flex cursor-pointer items-center justify-between border"
                        >
                          <div className="gap-sm flex items-center">
                            <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">{opt.icon}</span>
                            <div>
                              <span className="text-ui-small text-on-surface">
                                {opt.label}
                                {opt.value === "convert-vh" && (
                                  <span className="text-primary ml-1 text-[10px] font-bold uppercase">Recommended</span>
                                )}
                              </span>
                              <p className="text-on-surface-variant/70 mt-0.5 text-[11px]">{opt.desc}</p>
                            </div>
                          </div>
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              heightMode === opt.value
                                ? "border-primary-container bg-primary-container"
                                : "border-outline-variant"
                            }`}
                            onClick={() => setHeightMode(opt.value)}
                          >
                            {heightMode === opt.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="heightMode"
                            value={opt.value}
                            checked={heightMode === opt.value}
                            onChange={() => setHeightMode(opt.value)}
                            className="sr-only"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Modal Footer */}
                <div className="px-md py-sm bg-surface-container-highest border-outline-variant gap-sm flex justify-end border-t">
                  <button
                    onClick={() => setCaptureSettingsOpen(false)}
                    className="bg-surface-container-low border-outline-variant text-on-surface px-md text-ui-small hover:bg-surface-variant cursor-pointer rounded-sm border py-1.5 font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleCapture}
            disabled={!hasNavigated || isCapturing || isLoading}
            className="bg-primary-container text-on-primary-container gap-sm font-ui-small flex h-9 cursor-pointer items-center rounded px-4 font-semibold transition-all hover:brightness-110 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCapturing ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">screenshot_region</span>
            )}
            {isCapturing ? "Capturing..." : "Capture State"}
          </button>
        </div>
      </section>

      {/* Main Content */}
      <main onMouseDown={preventFocusSteal} className="bg-background p-md relative flex-1 overflow-hidden">
        <div className="bg-surface border-outline-variant relative flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-2xl">
          {hasNavigated && webviewPreloadPath ? (
            <>
              {/* Webview */}
              <div className="relative flex-1">
                <webview
                  ref={webviewRef as React.LegacyRef<Electron.WebviewTag>}
                  src={pendingUrl}
                  preload={`file://${webviewPreloadPath}`}
                  className="h-full w-full"
                  allowpopups={"true" as unknown as boolean}
                />
                {/* Loading overlay */}
                {isLoading && (
                  <div className="bg-primary/20 absolute top-0 right-0 left-0 h-0.5">
                    <div className="bg-primary h-full w-1/2 animate-pulse" />
                  </div>
                )}

              </div>

              {/* Frame Status Footer */}
              <div className="bg-surface-container border-outline-variant relative flex h-8 shrink-0 items-center border-t px-4">
                <div className="gap-md flex items-center">
                  <div className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-yellow-500" : "bg-green-500"}`} />
                    <span className="font-label-caps text-on-surface-variant text-[10px]">
                      {isLoading ? "Loading" : "Live"}
                    </span>
                  </div>
                </div>
                {hasNavigated && !isCapturing && (
                  <span className="font-label-caps text-on-surface-variant absolute left-1/2 -translate-x-1/2 text-[10px]">
                    Navigate to the desired state before capturing.
                  </span>
                )}
              </div>
            </>
          ) : (
            /* Empty state - no URL entered yet */
            <div className="flex w-full min-w-0 flex-1 items-center justify-center text-center">
              <div className="flex flex-col items-center gap-6 px-8" style={{ width: '100%', maxWidth: '480px' }}>
                <span className="material-symbols-outlined text-outline-variant/60 text-[64px]">language</span>
                <div className="space-y-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Enter a URL to get started
                  </h2>
                  <p className="font-body-main text-on-surface-variant opacity-70">
                    Type a website address in the bar above and press Enter. Navigate to
                    the desired state, then click Capture State.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>


      </main>

      {/* Capture progress modal */}
      {isCapturing && (
        <CaptureProgressModal
          steps={captureSteps}
          percentage={capturePercent}
          url={currentUrl}
          onCancel={() => {
            abortCaptureRef.current = true;
          }}
        />
      )}
    </div>
  );
}
