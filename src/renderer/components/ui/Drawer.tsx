import type { ReactNode } from "react";
import { useEffect, useState } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  icon?: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm?: () => void;
  width?: string;
}

function DrawerDefaultFooter({
  cancelLabel,
  confirmLabel,
  confirmVariant,
  onClose,
  onConfirm,
}: Pick<DrawerProps, "cancelLabel" | "confirmLabel" | "confirmVariant" | "onConfirm" | "onClose">) {
  const confirmStyles =
    confirmVariant === "danger"
      ? "bg-error-container text-on-error-container hover:brightness-110"
      : "bg-primary text-on-primary hover:brightness-110 shadow-[0_0_15px_rgba(210,187,255,0.3)]";

  return (
    <>
      <button
        onClick={onClose}
        className="border-outline-variant px-lg font-ui-small text-ui-small text-on-surface hover:bg-surface-variant h-8 cursor-pointer rounded border transition-all"
      >
        {cancelLabel}
      </button>
      {confirmLabel && onConfirm && (
        <button
          onClick={onConfirm}
          className={`px-lg font-ui-small text-ui-small h-8 cursor-pointer rounded font-semibold transition-all ${confirmStyles}`}
        >
          {confirmLabel}
        </button>
      )}
    </>
  );
}

function useEscapeKey(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);
}

function useDrawerAnimation(open: boolean) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return { isVisible, isAnimating };
}

export function Drawer({
  open, onClose, icon, title, children, footer,
  cancelLabel = "Cancel", confirmLabel, confirmVariant = "primary", onConfirm,
  width = "600px",
}: DrawerProps) {
  const { isVisible, isAnimating } = useDrawerAnimation(open);
  
  useEscapeKey(open, onClose);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-end">
      <div 
        onClick={onClose} 
        className={`bg-background/60 absolute inset-0 backdrop-blur-[6px] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
      />
      <div 
        style={{ width, maxWidth: "90vw" }}
        className={`border-outline-variant bg-surface-container/85 relative flex flex-col overflow-hidden border-l shadow-2xl backdrop-blur-[12px] transition-transform duration-300 ease-out ${
          isAnimating ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="border-outline-variant px-md py-sm flex items-center justify-between border-b">
          <div className="gap-sm flex items-center">
            {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
            <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-variant hover:text-on-surface flex cursor-pointer items-center justify-center rounded-lg p-1 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-lg flex-1 overflow-y-auto">{children}</div>
        <div className="gap-md border-outline-variant bg-surface-container-high px-md py-sm flex items-center justify-end border-t">
          {footer ?? <DrawerDefaultFooter cancelLabel={cancelLabel} confirmLabel={confirmLabel} confirmVariant={confirmVariant} onClose={onClose} onConfirm={onConfirm} />}
        </div>
      </div>
    </div>
  );
}
