import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, RefObject, SetStateAction } from "react";
import type { CaptureStep } from "../../components/CaptureProgressModal";
import type { CaptureBrowserToolbarProps } from "./components/CaptureBrowserToolbar";
import { useCropPrompt } from "./useCropPrompt";
import { normalizeCaptureUrl } from "./utils";

export function useCaptureBrowserState() {
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const abortCaptureRef = useRef(false);
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
  const [captureSteps, setCaptureSteps] = useState<CaptureStep[]>([]);
  const [capturePercent, setCapturePercent] = useState(0);
  const [previewBusy, setPreviewBusy] = useState<{ active: boolean; message: string }>({ active: false, message: "" });
  const cropPrompt = useCropPrompt();
  useWebviewPreloadPath(setWebviewPreloadPath);
  useNavigationSync({ webviewRef, hasNavigated, setAddressBarValue, setCanGoBack, setCanGoForward, setCurrentUrl, setIsLoading, setIsSecure });
  useFocusRetention(webviewRef, hasNavigated);
  const navigateTo = useCallback((input: string) => navigateWebview({ input, hasNavigated, webview: webviewRef.current, setAddressBarValue, setCurrentUrl, setHasNavigated, setIsSecure, setPendingUrl }), [hasNavigated]);
  const handleAddressBarKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => event.key === "Enter" && navigateTo(addressBarValue), [addressBarValue, navigateTo]);
  const handleRefresh = useCallback(() => (isLoading ? webviewRef.current?.stop() : webviewRef.current?.reload()), [isLoading]);
  const preventFocusSteal = useCallback((event: ReactMouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT") return;
    event.preventDefault();
  }, []);
  const toolbarProps: Omit<CaptureBrowserToolbarProps, "onCapture"> = { addressBarValue, canGoBack, canGoForward, hasNavigated, isCapturing, isLoading, isSecure, onAddressBarChange: setAddressBarValue, onAddressBarKeyDown: handleAddressBarKeyDown, onBack: () => webviewRef.current?.goBack(), onForward: () => webviewRef.current?.goForward(), onMouseDown: preventFocusSteal, onRefresh: handleRefresh };
  return { abortCaptureRef, captureState: { capturePercent, captureSteps, isCapturing }, cropPrompt, navigationState: { canGoBack, canGoForward, currentUrl, hasNavigated, isLoading, isSecure, pendingUrl, webviewPreloadPath }, preventFocusSteal, previewBusy, setCapturePercent, setCaptureSteps, setIsCapturing, setPreviewBusy, toolbarProps, webviewRef };
}

function useWebviewPreloadPath(setWebviewPreloadPath: Dispatch<SetStateAction<string>>) {
  useEffect(() => { window.api.getWebviewPreloadPath().then(setWebviewPreloadPath); }, [setWebviewPreloadPath]);
}

interface NavigationSyncOptions {
  webviewRef: RefObject<Electron.WebviewTag | null>;
  hasNavigated: boolean;
  setAddressBarValue: Dispatch<SetStateAction<string>>;
  setCanGoBack: Dispatch<SetStateAction<boolean>>;
  setCanGoForward: Dispatch<SetStateAction<boolean>>;
  setCurrentUrl: Dispatch<SetStateAction<string>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsSecure: Dispatch<SetStateAction<boolean>>;
}

function useNavigationSync(options: NavigationSyncOptions) {
  const { webviewRef, hasNavigated, setAddressBarValue, setCanGoBack, setCanGoForward, setCurrentUrl, setIsLoading, setIsSecure } = options;
  const updateNavState = useCallback(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    try {
      setCanGoBack(webview.canGoBack());
      setCanGoForward(webview.canGoForward());
    } catch { /* webview not ready */ }
  }, [setCanGoBack, setCanGoForward, webviewRef]);

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;
    const onStartLoading = () => setIsLoading(true);
    const onStopLoading = () => { setIsLoading(false); updateNavState(); };
    const onNavigate = (event: Electron.DidNavigateEvent | Electron.DidNavigateInPageEvent) => syncLocation({ url: event.url, setAddressBarValue, setCurrentUrl, setIsSecure, updateNavState });
    webview.addEventListener("did-start-loading", onStartLoading);
    webview.addEventListener("did-stop-loading", onStopLoading);
    webview.addEventListener("did-navigate", onNavigate);
    webview.addEventListener("did-navigate-in-page", onNavigate);
    return () => detachWebviewListeners({ webview, onStartLoading, onStopLoading, onNavigate });
  }, [hasNavigated, setAddressBarValue, setCurrentUrl, setIsLoading, setIsSecure, updateNavState, webviewRef]);
}

function useFocusRetention(webviewRef: RefObject<Electron.WebviewTag | null>, hasNavigated: boolean) {
  useEffect(() => {
    if (!hasNavigated) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT") return;
      if (webviewRef.current && document.contains(webviewRef.current)) webviewRef.current.focus();
    };
    window.addEventListener("focusin", onFocusIn);
    return () => window.removeEventListener("focusin", onFocusIn);
  }, [hasNavigated, webviewRef]);
}

interface NavigateOptions {
  input: string;
  hasNavigated: boolean;
  webview: Electron.WebviewTag | null;
  setAddressBarValue: Dispatch<SetStateAction<string>>;
  setCurrentUrl: Dispatch<SetStateAction<string>>;
  setHasNavigated: Dispatch<SetStateAction<boolean>>;
  setIsSecure: Dispatch<SetStateAction<boolean>>;
  setPendingUrl: Dispatch<SetStateAction<string>>;
}

function navigateWebview(options: NavigateOptions) {
  const { input, hasNavigated, webview, setAddressBarValue, setCurrentUrl, setHasNavigated, setIsSecure, setPendingUrl } = options;
  const url = normalizeCaptureUrl(input);
  if (!url) return;
  setCurrentUrl(url);
  setAddressBarValue(url);
  setIsSecure(url.startsWith("https://"));
  if (!hasNavigated) return initializeWebview(url, setHasNavigated, setPendingUrl);
  if (webview) webview.src = url;
}

function initializeWebview(url: string, setHasNavigated: Dispatch<SetStateAction<boolean>>, setPendingUrl: Dispatch<SetStateAction<string>>) {
  setPendingUrl(url);
  setHasNavigated(true);
}

interface SyncLocationOptions {
  url: string;
  setAddressBarValue: Dispatch<SetStateAction<string>>;
  setCurrentUrl: Dispatch<SetStateAction<string>>;
  setIsSecure: Dispatch<SetStateAction<boolean>>;
  updateNavState: () => void;
}

function syncLocation({ url, setAddressBarValue, setCurrentUrl, setIsSecure, updateNavState }: SyncLocationOptions) {
  setCurrentUrl(url);
  setAddressBarValue(url);
  setIsSecure(url.startsWith("https://"));
  updateNavState();
}

interface DetachListenersOptions {
  webview: Electron.WebviewTag;
  onStartLoading: () => void;
  onStopLoading: () => void;
  onNavigate: (event: Electron.DidNavigateEvent | Electron.DidNavigateInPageEvent) => void;
}

function detachWebviewListeners({ webview, onStartLoading, onStopLoading, onNavigate }: DetachListenersOptions) {
  webview.removeEventListener("did-start-loading", onStartLoading);
  webview.removeEventListener("did-stop-loading", onStopLoading);
  webview.removeEventListener("did-navigate", onNavigate);
  webview.removeEventListener("did-navigate-in-page", onNavigate);
}


