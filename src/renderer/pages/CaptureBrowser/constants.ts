import type { CaptureStepDefinition, HeightMode } from "./types";

export const CAPTURE_STEPS: CaptureStepDefinition[] = [
  { key: "stylesheets", label: "Fetching style sheets" },
  { key: "images", label: "Downloading images" },
  { key: "scripts", label: "Cleaning up the page" },
  { key: "cssom", label: "Processing styles" },
  { key: "fonts", label: "Converting fonts" },
  { key: "layout", label: "Adjusting layout" },
  { key: "cleanup", label: "Tidying up the HTML" },
  { key: "assets", label: "Extracting assets" },
  { key: "screenshot", label: "Creating preview" },
  { key: "format", label: "Formatting the code" },
  { key: "save", label: "Saving your project" },
];

export const HEIGHT_MODE_OPTIONS: { desc: string; icon: string; label: string; value: HeightMode }[] = [
  { value: "convert-vh", label: "Convert to viewport-relative", desc: "Replace frozen heights with dynamic calc(100vh - ...)", icon: "swap_vert" },
  { value: "remove", label: "Remove hardcoded heights", desc: "Strip matching heights, let CSS rules take over", icon: "delete_sweep" },
  { value: "keep-as-is", label: "Keep original heights", desc: "Preserve pixel values as captured", icon: "lock" },
];
