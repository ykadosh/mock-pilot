import type { LegacyRef, MouseEvent as ReactMouseEvent, RefObject } from "react";

interface ViewportProps {
  hasNavigated: boolean;
  isCapturing: boolean;
  isLoading: boolean;
  pendingUrl: string;
  preventFocusSteal: (event: ReactMouseEvent) => void;
  webviewPreloadPath: string;
  webviewRef: RefObject<Electron.WebviewTag | null>;
}

export function CaptureBrowserViewport(props: ViewportProps) {
  return (
    <main onMouseDown={props.preventFocusSteal} className="bg-background p-md relative flex-1 overflow-hidden">
      <div className="bg-surface border-outline-variant relative flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-2xl">{props.hasNavigated && props.webviewPreloadPath ? <WebviewPane {...props} /> : <EmptyState />}</div>
    </main>
  );
}

function WebviewPane(props: ViewportProps) {
  return (
    <>
      <div className="relative flex-1"><webview ref={props.webviewRef as LegacyRef<Electron.WebviewTag>} src={props.pendingUrl} preload={`file://${props.webviewPreloadPath}`} className="h-full w-full" allowpopups={"true" as unknown as boolean} />{props.isLoading && <div className="bg-primary/20 absolute top-0 right-0 left-0 h-0.5"><div className="bg-primary h-full w-1/2 animate-pulse" /></div>}</div>
      <StatusFooter hasNavigated={props.hasNavigated} isCapturing={props.isCapturing} isLoading={props.isLoading} />
    </>
  );
}

function StatusFooter({ hasNavigated, isCapturing, isLoading }: { hasNavigated: boolean; isCapturing: boolean; isLoading: boolean }) {
  return <div className="bg-surface-container border-outline-variant relative flex h-8 shrink-0 items-center border-t px-4"><div className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-yellow-500" : "bg-green-500"}`} /><span className="font-label-caps text-on-surface-variant text-[10px]">{isLoading ? "Loading" : "Live"}</span></div>{hasNavigated && !isCapturing && <span className="font-label-caps text-on-surface-variant absolute left-1/2 -translate-x-1/2 text-[10px]">Navigate to the desired state before capturing.</span>}</div>;
}

function EmptyState() {
  return <div className="flex w-full min-w-0 flex-1 items-center justify-center text-center"><div className="flex flex-col items-center gap-6 px-8" style={{ width: "100%", maxWidth: "480px" }}><span className="material-symbols-outlined text-outline-variant/60 text-[64px]">language</span><div className="space-y-2"><h2 className="font-headline-md text-headline-md text-on-surface">Enter a URL to get started</h2><p className="font-body-main text-on-surface-variant opacity-70">Type a website address in the bar above and press Enter. Navigate to the desired state, then click Capture State.</p></div></div></div>;
}
