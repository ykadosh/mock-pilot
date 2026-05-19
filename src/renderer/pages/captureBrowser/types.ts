import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CaptureStep } from "../../components/CaptureProgressModal";

export type HeightMode = "convert-vh" | "remove" | "keep-as-is";

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

export interface ExtractedAssets {
  typography: ExtractedTypography[];
  colors: ExtractedColor[];
}

export interface CaptureProgressState {
  abortCaptureRef: MutableRefObject<boolean>;
  setCapturePercent: Dispatch<SetStateAction<number>>;
  setCaptureSteps: Dispatch<SetStateAction<CaptureStep[]>>;
}
