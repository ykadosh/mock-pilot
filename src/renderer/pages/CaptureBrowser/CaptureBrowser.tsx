import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CaptureProgressModal } from "../../components/CaptureProgressModal";
import { CaptureBrowserHeader } from "./components/CaptureBrowserHeader";
import { CaptureBrowserToolbar } from "./components/CaptureBrowserToolbar";
import { CaptureBrowserViewport } from "./components/CaptureBrowserViewport";
import { CropCaptureDialog } from "./components/CropCaptureDialog";
import { extendPreviewCapture } from "./cropCaptureHelpers";
import { useCaptureBrowserCapture } from "./useCaptureBrowserCapture";
import { useCaptureBrowserState } from "./useCaptureBrowserState";

export function CaptureBrowser() {
  const navigate = useNavigate();
  const state = useCaptureBrowserState();
  const handleCapture = useCaptureBrowserCapture({ abortCaptureRef: state.abortCaptureRef, currentUrl: state.navigationState.currentUrl, heightMode: state.captureState.heightMode, navigate, promptForCrop: state.cropPrompt.promptForCrop, setCapturePercent: state.setCapturePercent, setCaptureSteps: state.setCaptureSteps, setIsCapturing: state.setIsCapturing, webviewRef: state.webviewRef });
  const handleExtendPreview = useCallback(async (targetHeight: number) => {
    const webview = state.webviewRef.current;
    if (!webview) throw new Error("webview is not ready");
    return extendPreviewCapture(webview, targetHeight);
  }, [state.webviewRef]);
  return (
    <div className="bg-background text-on-surface font-body-main flex h-screen flex-col overflow-hidden antialiased">
      <CaptureBrowserHeader onMouseDown={state.preventFocusSteal} />
      <CaptureBrowserToolbar {...state.toolbarProps} onCapture={handleCapture} />
      <CaptureBrowserViewport hasNavigated={state.navigationState.hasNavigated} isCapturing={state.captureState.isCapturing} isLoading={state.navigationState.isLoading} pendingUrl={state.navigationState.pendingUrl} preventFocusSteal={state.preventFocusSteal} webviewPreloadPath={state.navigationState.webviewPreloadPath} webviewRef={state.webviewRef} />
      {state.cropPrompt.cropPromptOpen && state.cropPrompt.cropPreview && (
        <CropCaptureDialog preview={state.cropPrompt.cropPreview} onCancel={() => state.cropPrompt.resolveCropPrompt(null)} onConfirm={region => state.cropPrompt.resolveCropPrompt(region)} onExtendPreview={handleExtendPreview} />
      )}
      {state.captureState.isCapturing && <CaptureProgressModal steps={state.captureState.captureSteps} percentage={state.captureState.capturePercent} url={state.navigationState.currentUrl} onCancel={() => { state.abortCaptureRef.current = true; }} />}
    </div>
  );
}
