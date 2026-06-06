import type { CaptureStepDefinition } from "./types";

export const CAPTURE_STEPS: CaptureStepDefinition[] = [
  { key: "stylesheets", label: "Fetching style sheets" },
  { key: "images", label: "Downloading images" },
  { key: "scripts", label: "Cleaning up the page" },
  { key: "cssom", label: "Processing styles" },
  { key: "fonts", label: "Converting fonts" },
  { key: "layout", label: "Adjusting layout" },
  { key: "crop", label: "Cropping the capture" },
  { key: "cleanup", label: "Tidying up the HTML" },
  { key: "assets", label: "Extracting assets" },
  { key: "screenshot", label: "Creating preview" },
  { key: "format", label: "Formatting the code" },
  { key: "save", label: "Saving your project" },
];
