import { useCallback, useRef, useState } from "react";

interface SidePanelProps {
  title?: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 288;

function useResizable(minWidth: number) {
  const [width, setWidth] = useState(minWidth);
  const dragging = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (ev: MouseEvent) => {
      setWidth(Math.max(minWidth, startWidth + (startX - ev.clientX)));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [width, minWidth]);

  return { width, onMouseDown };
}

export function SidePanel({ title, headerLeft, headerRight, onClose, children }: SidePanelProps) {
  const { width, onMouseDown } = useResizable(MIN_WIDTH);

  return (
    <aside
      style={{ width }}
      className="absolute top-14 right-4 bottom-4 z-50 flex flex-col overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 shadow-2xl backdrop-blur-lg"
    >
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 bottom-0 left-0 z-10 w-1.5 cursor-col-resize hover:bg-violet-500/30"
      />
      <div className="p-sm flex items-center justify-between gap-2 rounded-t-lg border-b border-slate-700 bg-slate-800">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {headerLeft ?? (
            <span className="font-label-caps text-label-caps text-slate-300">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            onClick={onClose}
            className="cursor-pointer text-slate-500 hover:text-slate-200"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
