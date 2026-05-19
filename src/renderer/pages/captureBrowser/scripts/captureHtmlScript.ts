import type { HeightMode } from "../types";
import { CAPTURE_HTML_SCRIPT_CLEANUP } from "./captureHtmlScriptCleanup";
import { CAPTURE_HTML_SCRIPT_MEDIA } from "./captureHtmlScriptMedia";
import { CAPTURE_HTML_SCRIPT_PRELUDE } from "./captureHtmlScriptPrelude";
import { CAPTURE_HTML_SCRIPT_STYLES } from "./captureHtmlScriptStyles";

export function createCaptureHtmlScript(heightMode: HeightMode) {
  return [
    CAPTURE_HTML_SCRIPT_PRELUDE.replace("__HEIGHT_MODE__", JSON.stringify(heightMode)),
    CAPTURE_HTML_SCRIPT_MEDIA,
    CAPTURE_HTML_SCRIPT_STYLES,
    CAPTURE_HTML_SCRIPT_CLEANUP,
  ].join("\n");
}
