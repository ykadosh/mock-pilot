import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

export interface CaptureBrowserToolbarProps {
  addressBarValue: string;
  canGoBack: boolean;
  canGoForward: boolean;
  hasNavigated: boolean;
  isCapturing: boolean;
  isLoading: boolean;
  isSecure: boolean;
  onAddressBarChange: (value: string) => void;
  onAddressBarKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBack: () => void;
  onCapture: () => void;
  onForward: () => void;
  onMouseDown: (event: ReactMouseEvent) => void;
  onRefresh: () => void;
}

export function CaptureBrowserToolbar(props: CaptureBrowserToolbarProps) {
  return (
    <section onMouseDown={props.onMouseDown} className="bg-surface-container-low gap-md border-outline-variant flex h-14 shrink-0 items-center border-b px-4">
      <NavigationButtons canGoBack={props.canGoBack} canGoForward={props.canGoForward} hasNavigated={props.hasNavigated} isLoading={props.isLoading} onBack={props.onBack} onForward={props.onForward} onRefresh={props.onRefresh} />
      <AddressBar addressBarValue={props.addressBarValue} isSecure={props.isSecure} onAddressBarChange={props.onAddressBarChange} onAddressBarKeyDown={props.onAddressBarKeyDown} />
      <CaptureActions hasNavigated={props.hasNavigated} isCapturing={props.isCapturing} isLoading={props.isLoading} onCapture={props.onCapture} />
    </section>
  );
}

function NavigationButtons(props: { canGoBack: boolean; canGoForward: boolean; hasNavigated: boolean; isLoading: boolean; onBack: () => void; onForward: () => void; onRefresh: () => void }) {
  return <div className="gap-xs flex items-center"><IconButton disabled={!props.canGoBack} icon="arrow_back" onClick={props.onBack} /><IconButton disabled={!props.canGoForward} icon="arrow_forward" onClick={props.onForward} /><IconButton disabled={!props.hasNavigated} icon={props.isLoading ? "close" : "refresh"} onClick={props.onRefresh} /></div>;
}

function IconButton({ disabled, icon, onClick }: { disabled: boolean; icon: string; onClick: () => void }) {
  return <button onClick={onClick} disabled={disabled} className="text-on-surface-variant hover:bg-surface-container-highest flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-colors disabled:cursor-default disabled:opacity-30"><span className="material-symbols-outlined text-[18px]">{icon}</span></button>;
}

function AddressBar(props: { addressBarValue: string; isSecure: boolean; onAddressBarChange: (value: string) => void; onAddressBarKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void }) {
  return (
    <div className="bg-surface-container-lowest border-outline-variant focus-within:border-primary gap-sm flex h-9 flex-1 items-center rounded border px-3 transition-colors">
      {props.isSecure && <span className="material-symbols-outlined text-primary text-[16px]">lock</span>}
      <input type="text" value={props.addressBarValue} onChange={(event) => props.onAddressBarChange(event.target.value)} onKeyDown={props.onAddressBarKeyDown} onFocus={(event) => event.target.select()} placeholder="Enter a URL and press Enter" className="text-ui-small text-on-surface-variant font-code-block w-full border-none bg-transparent p-0 focus:ring-0 focus:outline-none" autoFocus />
    </div>
  );
}

function CaptureActions(props: { hasNavigated: boolean; isCapturing: boolean; isLoading: boolean; onCapture: () => void }) {
  return (
    <div className="gap-xs relative flex items-center">
      <button onClick={props.onCapture} disabled={!props.hasNavigated || props.isCapturing || props.isLoading} className="bg-primary-container text-on-primary-container gap-sm font-ui-small flex h-9 cursor-pointer items-center rounded px-4 font-semibold transition-all hover:brightness-110 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{props.isCapturing ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">screenshot_region</span>}{props.isCapturing ? "Capturing..." : "Capture State"}</button>
    </div>
  );
}
