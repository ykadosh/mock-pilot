import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setCapturedHtml } from "../lib/store";

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

    setIsCapturing(true);
    try {
      // Extract the full HTML from the webview's current state
      const rawHtml = await wv.executeJavaScript(`
        (async () => {
          // Helper: resolve and inline font URLs in CSS text relative to a base URL
          async function inlineFontUrls(cssText, baseUrl) {
            const fontFaceRegex = /@font-face\\s*\\{[^}]*\\}/gi;
            const fontFaces = [...cssText.matchAll(fontFaceRegex)];
            for (const faceMatch of fontFaces) {
              let faceBlock = faceMatch[0];
              const urlRegex = /url\\(["']?([^"')]+?)["']?\\)\\s*format\\(["']?(woff2?|truetype|opentype|embedded-opentype)["']?\\)/gi;
              const urlMatches = [...faceBlock.matchAll(urlRegex)];
              for (const match of urlMatches) {
                const fontUrl = match[1];
                if (fontUrl.startsWith("data:")) continue;
                try {
                  const resolvedUrl = new URL(fontUrl, baseUrl).href;
                  const res = await fetch(resolvedUrl);
                  if (res.ok) {
                    const blob = await res.blob();
                    const dataUri = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result);
                      reader.readAsDataURL(blob);
                    });
                    faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '") format("' + match[2] + '")');
                  }
                } catch {}
              }
              const simpleUrlRegex = /url\\(["']?([^"')]+\\.(?:woff2?|ttf|otf|eot)[^"')]*?)["']?\\)/gi;
              const simpleMatches = [...faceBlock.matchAll(simpleUrlRegex)];
              for (const match of simpleMatches) {
                const fontUrl = match[1];
                if (fontUrl.startsWith("data:")) continue;
                try {
                  const resolvedUrl = new URL(fontUrl, baseUrl).href;
                  const res = await fetch(resolvedUrl);
                  if (res.ok) {
                    const blob = await res.blob();
                    const dataUri = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result);
                      reader.readAsDataURL(blob);
                    });
                    faceBlock = faceBlock.replace(match[0], 'url("' + dataUri + '")');
                  }
                } catch {}
              }
              cssText = cssText.replace(faceMatch[0], faceBlock);
            }
            return cssText;
          }

          // Inline external stylesheets
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
          for (const link of stylesheets) {
            try {
              const href = link.href;
              const res = await fetch(href);
              let css = await res.text();
              css = await inlineFontUrls(css, href);
              const style = document.createElement("style");
              style.textContent = css;
              link.replaceWith(style);
            } catch {}
          }

          // Process existing style tags
          const inlineStyles = document.querySelectorAll("style");
          for (const style of inlineStyles) {
            style.textContent = await inlineFontUrls(style.textContent || "", document.baseURI);
          }

          // Convert images to data URIs
          const images = document.querySelectorAll("img");
          for (const img of images) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth || img.width || 300;
              canvas.height = img.naturalHeight || img.height || 200;
              const ctx = canvas.getContext("2d");
              if (ctx && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, 0, 0);
                img.src = canvas.toDataURL("image/png");
              }
            } catch {}
          }

          // Remove scripts
          document.querySelectorAll("script").forEach((s) => s.remove());

          // Remove HTML comments
          const walker = document.createTreeWalker(document, NodeFilter.SHOW_COMMENT);
          const comments = [];
          while (walker.nextNode()) comments.push(walker.currentNode);
          comments.forEach((c) => c.remove());

          // Remove hidden elements
          document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => el.remove());

          // Collapse whitespace-only text nodes
          const textWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
          const textNodes = [];
          while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
          textNodes.forEach((t) => {
            if (t.textContent && /^\\s+$/.test(t.textContent)) {
              t.textContent = "\\n";
            }
          });

          return document.documentElement.outerHTML;
        })()
      `);

      // Take a screenshot from the webview
      const nativeImage = await wv.capturePage();
      const thumbnailDataUrl = nativeImage.toDataURL();

      // Format the HTML via main process
      const formatResult = await window.api.formatHtml(rawHtml);
      if (!formatResult.success || !formatResult.html) {
        throw new Error(formatResult.error || "Failed to format HTML");
      }

      // Derive a project title from the URL
      let title: string;
      try {
        title = new URL(currentUrl).hostname.replace(/^www\./, "");
      } catch {
        title = currentUrl;
      }

      // Save the project
      const project = await window.api.saveProject({
        url: currentUrl,
        title,
        html: formatResult.html,
        thumbnail: thumbnailDataUrl,
      });

      setCapturedHtml(formatResult.html);
      navigate(`/editor/${project.id}`);
    } catch (err: unknown) {
      console.error("Capture failed:", err);
      alert(err instanceof Error ? err.message : "Failed to capture website state");
    } finally {
      setIsCapturing(false);
    }
  };

  // Prevent clicks outside the webview from stealing focus,
  // which would close menus/dropdowns inside the browsed website.
  const preventFocusSteal = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="bg-background text-on-surface font-body-main antialiased overflow-hidden h-screen flex flex-col">
      {/* Top Nav Bar */}
      <header onMouseDown={preventFocusSteal} className="bg-slate-900 border-b border-slate-700 flex justify-between items-center pl-20 pr-4 h-12 w-full z-50 [-webkit-app-region:drag]">
        <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
          <span
            onClick={() => navigate("/")}
            className="text-lg font-bold tracking-tighter text-slate-50 cursor-pointer font-headline-md"
          >
            MockPilot
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <span className="font-ui-small text-slate-400">Capture Browser</span>
        </div>
        <div className="flex items-center gap-md [-webkit-app-region:no-drag]">
          <button
            onClick={() => navigate("/")}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer font-ui-small flex items-center gap-xs"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Cancel
          </button>
        </div>
      </header>

      {/* Browser Controls Bar */}
      <section onMouseDown={preventFocusSteal} className="h-14 bg-surface-container-low flex items-center px-4 gap-md border-b border-outline-variant shrink-0">
        {/* Navigation buttons */}
        <div className="flex items-center gap-xs">
          <button
            onClick={handleBack}
            disabled={!canGoBack}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <button
            onClick={handleForward}
            disabled={!canGoForward}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={!hasNavigated}
            className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors rounded disabled:opacity-30 disabled:cursor-default cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isLoading ? "close" : "refresh"}
            </span>
          </button>
        </div>

        {/* Address bar */}
        <div className="flex-1 flex items-center bg-surface-container-lowest border border-outline-variant rounded px-3 h-9 gap-sm">
          {isSecure && (
            <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
          )}
          <input
            type="text"
            value={addressBarValue}
            onChange={(e) => setAddressBarValue(e.target.value)}
            onKeyDown={handleAddressBarKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Enter a URL and press Enter"
            className="bg-transparent border-none p-0 text-ui-small text-on-surface-variant focus:ring-0 w-full font-code-block focus:outline-none"
            autoFocus
          />
        </div>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={!hasNavigated || isCapturing || isLoading}
          className="bg-primary-container text-on-primary-container px-4 h-9 flex items-center gap-sm font-ui-small font-semibold rounded hover:brightness-110 active:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isCapturing ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">screenshot_region</span>
          )}
          {isCapturing ? "Capturing..." : "Capture State"}
        </button>
      </section>

      {/* Main Content */}
      <main onMouseDown={preventFocusSteal} className="flex-1 relative bg-background overflow-hidden p-md">
        <div className="w-full h-full bg-surface rounded-lg border border-outline-variant shadow-2xl relative overflow-hidden flex flex-col">
          {hasNavigated ? (
            <>
              {/* Webview */}
              <div className="flex-1 relative">
                <webview
                  ref={webviewRef as React.LegacyRef<Electron.WebviewTag>}
                  src={pendingUrl}
                  className="w-full h-full"
                  allowpopups={"true" as unknown as boolean}
                />
                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20">
                    <div className="h-full bg-primary animate-pulse w-1/2" />
                  </div>
                )}

              </div>

              {/* Frame Status Footer */}
              <div className="h-8 bg-surface-container border-t border-outline-variant flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-md">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
                    <span className="text-[10px] font-label-caps text-on-surface-variant">
                      {isLoading ? "Loading" : "Live"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state - no URL entered yet */
            <div className="flex-1 flex items-center justify-center text-center w-full min-w-0">
              <div className="flex flex-col items-center gap-6 px-8" style={{ width: '100%', maxWidth: '480px' }}>
                <span className="material-symbols-outlined text-[64px] text-outline-variant/60">language</span>
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

        {/* Floating instruction bar */}
        {hasNavigated && !isCapturing && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-outline-variant px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 backdrop-blur-xl">
            <span className="text-ui-small text-on-surface">Navigate to the desired state before capturing.</span>
          </div>
        )}
      </main>
    </div>
  );
}
