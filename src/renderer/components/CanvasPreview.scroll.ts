interface ScrollArgs {
  iframe: HTMLIFrameElement | null;
  container: HTMLDivElement | null;
  mpId: string;
  scale: number;
}

function getElementInContent({ iframe, container, mpId, scale }: ScrollArgs) {
  const doc = iframe?.contentDocument;
  const el = doc?.querySelector(`[data-mp-id="${CSS.escape(mpId)}"]`);
  if (!el || !iframe || !container) return null;
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const left = iframeRect.left - containerRect.left + container.scrollLeft + elRect.left * scale;
  const top = iframeRect.top - containerRect.top + container.scrollTop + elRect.top * scale;
  return { left, top, width: elRect.width * scale, height: elRect.height * scale };
}

export function scrollElementIntoView(args: ScrollArgs) {
  const { container } = args;
  if (!container) return;
  const rect = getElementInContent(args);
  if (!rect) return;
  const visibleRight = container.scrollLeft + container.clientWidth;
  const visibleBottom = container.scrollTop + container.clientHeight;
  const leftOff = rect.left < container.scrollLeft || rect.left + rect.width > visibleRight;
  const topOff = rect.top < container.scrollTop || rect.top + rect.height > visibleBottom;
  if (!leftOff && !topOff) return;
  const targetLeft = leftOff ? rect.left - container.clientWidth / 2 + rect.width / 2 : container.scrollLeft;
  const targetTop = topOff ? rect.top - container.clientHeight / 2 + rect.height / 2 : container.scrollTop;
  container.scrollTo({ left: Math.max(0, targetLeft), top: Math.max(0, targetTop), behavior: "smooth" });
}
