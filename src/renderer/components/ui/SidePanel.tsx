import { useCallback, useRef, useState } from "react";

interface SidePanelProps {
  title: string;
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

export function SidePanel({ title, onClose, children }: SidePanelProps) {
  const { width, onMouseDown } = useResizable(MIN_WIDTH);

  return (
    <aside
      style={{ width }}
      className="absolute top-14 right-4 bottom-4 z-50 flex flex-col overflow-hidden rounded-lg border border-[#334155] bg-slate-900/90 shadow-2xl backdrop-blur-md"
    >
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 bottom-0 left-0 z-10 w-1.5 cursor-col-resize hover:bg-violet-500/30"
      />
      <div className="p-sm flex items-center justify-between rounded-t-lg border-b border-slate-700 bg-slate-800">
        <span className="font-label-caps text-label-caps text-slate-300">
          {title}
        </span>
        <button
          onClick={onClose}
          className="material-symbols-outlined cursor-pointer text-sm text-slate-500 hover:text-slate-200"
        >
          close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
