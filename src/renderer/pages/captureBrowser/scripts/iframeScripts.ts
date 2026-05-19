import { IFRAME_DATA_SCRIPT } from "./iframeDataScript";
import { INLINE_FRAMES_SCRIPT_END } from "./inlineFramesScriptEnd";
import { INLINE_FRAMES_SCRIPT_MIDDLE, INLINE_FRAMES_SCRIPT_START } from "./inlineFramesScriptStart";

export function buildInlineCapturedFramesScript(capturedMapJson: string) {
  return `${INLINE_FRAMES_SCRIPT_START}${capturedMapJson}${INLINE_FRAMES_SCRIPT_MIDDLE}${INLINE_FRAMES_SCRIPT_END}`;
}

export function buildIframeFallbackScript(index: number) {
  return `
    (function() {
      var iframe = document.querySelectorAll("iframe")[${index}];
      if (!iframe) return;
      var placeholder = document.createElement("div");
      placeholder.setAttribute("data-iframe-failed", "true");
      placeholder.setAttribute("data-iframe-src", iframe.getAttribute("src") || "");
      placeholder.style.border = "1px dashed #ccc";
      placeholder.style.padding = "1em";
      placeholder.style.textAlign = "center";
      placeholder.style.color = "#999";
      placeholder.textContent = "[iframe content could not be captured]";
      iframe.replaceWith(placeholder);
    })()
  `;
}

export { IFRAME_DATA_SCRIPT };
