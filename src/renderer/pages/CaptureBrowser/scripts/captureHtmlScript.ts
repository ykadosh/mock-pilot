import type { CropRegion, HeightMode } from "../types";
import { CAPTURE_HTML_SCRIPT_CLEANUP } from "./captureHtmlScriptCleanup";
import { CAPTURE_HTML_SCRIPT_CROP } from "./captureHtmlScriptCrop";
import { CAPTURE_HTML_SCRIPT_FONTS } from "./captureHtmlScriptFonts";
import { CAPTURE_HTML_SCRIPT_MEDIA } from "./captureHtmlScriptMedia";
import { CAPTURE_HTML_SCRIPT_PICTURE_SOURCES } from "./captureHtmlScriptPictureSources";
import { CAPTURE_HTML_SCRIPT_PRELUDE } from "./captureHtmlScriptPrelude";
import { CAPTURE_HTML_SCRIPT_SHADOW_DOM } from "./captureHtmlScriptShadowDom";
import { CAPTURE_HTML_SCRIPT_STYLES } from "./captureHtmlScriptStyles";

export function createCaptureHtmlScript(heightMode: HeightMode, cropRegion?: CropRegion, naturalHeight?: number) {
  void naturalHeight;
  const isNoOpCrop = cropRegion && cropRegion.top === 0 && cropRegion.height === cropRegion.pageHeight;
  const cropScript = cropRegion && !isNoOpCrop
    ? CAPTURE_HTML_SCRIPT_CROP
        .replace("__CROP_TOP__", String(cropRegion.top))
        .replace("__CROP_HEIGHT__", String(cropRegion.height))
        .replace("__CROP_PAGE_HEIGHT__", String(cropRegion.pageHeight))
    : "";
  return [
    CAPTURE_HTML_SCRIPT_PRELUDE.replace("__HEIGHT_MODE__", JSON.stringify(heightMode)),
    CAPTURE_HTML_SCRIPT_SHADOW_DOM,
    CAPTURE_HTML_SCRIPT_PICTURE_SOURCES,
    CAPTURE_HTML_SCRIPT_MEDIA,
    CAPTURE_HTML_SCRIPT_FONTS,
    CAPTURE_HTML_SCRIPT_STYLES,
    cropScript,
    CAPTURE_HTML_SCRIPT_CLEANUP,
  ].filter(Boolean).join("\n");
}
