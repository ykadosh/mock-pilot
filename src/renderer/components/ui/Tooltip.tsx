import type { ReactNode } from "react";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  placement?: TooltipPlacement;
  children: ReactNode;
}

const PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

export function Tooltip({ label, placement = "top", children }: TooltipProps) {
  return (
    <div className="group relative">
      {children}
      <div className={`pointer-events-none invisible absolute z-50 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] whitespace-nowrap text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 ${PLACEMENT_CLASSES[placement]}`}>
        {label}
      </div>
    </div>
  );
}
