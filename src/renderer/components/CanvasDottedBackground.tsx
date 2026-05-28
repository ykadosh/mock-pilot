import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const BASE_DOTS = "radial-gradient(circle at 50% 50%, rgb(32 43 65) 1.25px, transparent 1.5px) 0 0 / 16px 16px repeat";
const GLOW_DOTS = "radial-gradient(circle at 50% 50%, rgb(140 160 210) 1.25px, transparent 1.5px) 0 0 / 16px 16px repeat";
const GLOW_MASK = "radial-gradient(circle 150px at var(--mx) var(--my), black 0%, transparent 70%)";

const wrapperStyle: CSSProperties = { background: BASE_DOTS };
const overlayStyle: CSSProperties = {
  background: GLOW_DOTS,
  opacity: "var(--glow-opacity, 0)" as unknown as number,
  transition: "opacity 200ms ease-out",
  maskImage: GLOW_MASK,
  WebkitMaskImage: GLOW_MASK,
};

export function CanvasDottedBackground({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPos = useRef<{ x: number; y: number } | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    const overlay = overlayRef.current;
    const pos = pendingPos.current;
    if (!overlay || !pos) return;
    overlay.style.setProperty("--mx", `${pos.x}px`);
    overlay.style.setProperty("--my", `${pos.y}px`);
    overlay.style.setProperty("--glow-opacity", "1");
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    pendingPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
  }, [flush]);

  const handleMouseLeave = useCallback(() => {
    overlayRef.current?.style.setProperty("--glow-opacity", "0");
  }, []);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex min-h-full w-fit min-w-full items-center justify-center p-[240px]" style={wrapperStyle} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div ref={overlayRef} aria-hidden className="pointer-events-none absolute inset-0" style={overlayStyle} />
      {children}
    </div>
  );
}
