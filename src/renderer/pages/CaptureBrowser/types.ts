import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CaptureStep } from "../../components/CaptureProgressModal";

export type HeightMode = "convert-vh" | "remove" | "keep-as-is";

export interface CropRegion {
  top: number;
  height: number;
}

export interface CropPreview {
  dataUrl: string;
  naturalHeight: number;
  viewportWidth: number;
}

export interface CaptureStepDefinition {
  key: string;
  label: string;
}

export interface ExtractedTypography {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
}

export interface ExtractedColor {
  value: string;
}

export interface ExtractedIcons {
  libraries: string[];
}

export interface ExtractedComponentProp {
  name: string;
  type: string;
  description: string;
}

export interface ExtractedComponent {
  label: string;
  html: string;
  count: number;
  hash: string;
  description?: string;
  props?: ExtractedComponentProp[];
}

export interface ExtractedAssets {
  typography: ExtractedTypography[];
  colors: ExtractedColor[];
  icons?: ExtractedIcons;
  components?: ExtractedComponent[];
  componentsCss?: string;
}

export interface CaptureProgressState {
  abortCaptureRef: MutableRefObject<boolean>;
  setCapturePercent: Dispatch<SetStateAction<number>>;
  setCaptureSteps: Dispatch<SetStateAction<CaptureStep[]>>;
}
