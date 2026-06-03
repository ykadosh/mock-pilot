import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  placement?: TooltipPlacement;
  children: ReactNode;
  disabled?: boolean;
}

const VIEWPORT_MARGIN = 8;
const OFFSET = 8;

export function Tooltip({ label, placement = "top", children, disabled = false }: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;
    const t = trigger.getBoundingClientRect();
    const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    let top = 0, left = 0;
    switch (placement) {
      case "top":    top = t.top - th - OFFSET;           left = t.left + t.width / 2 - tw / 2; break;
      case "bottom": top = t.bottom + OFFSET;             left = t.left + t.width / 2 - tw / 2; break;
      case "left":   top = t.top + t.height / 2 - th / 2; left = t.left - tw - OFFSET;          break;
      case "right":  top = t.top + t.height / 2 - th / 2; left = t.right + OFFSET;              break;
    }
    const vw = window.innerWidth, vh = window.innerHeight;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - tw - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - th - VIEWPORT_MARGIN));
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [visible, placement, label]);

  return (
    <div ref={triggerRef} className="relative" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && !disabled && createPortal(
        <div ref={tooltipRef} style={{ position: "fixed", top: 0, left: 0 }} className="pointer-events-none z-50 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] whitespace-nowrap text-white shadow-lg">
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}
