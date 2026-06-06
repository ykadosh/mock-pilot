import { useCallback, useRef, useState } from "react";
import type { CropPreview, CropRegion } from "./types";

export interface CropPromptHandlers {
  cropPreview: CropPreview | null;
  cropPromptOpen: boolean;
  promptForCrop: (preview: CropPreview) => Promise<CropRegion | null>;
  resolveCropPrompt: (region: CropRegion | null) => void;
}

export function useCropPrompt(): CropPromptHandlers {
  const [cropPreview, setCropPreview] = useState<CropPreview | null>(null);
  const [cropPromptOpen, setCropPromptOpen] = useState(false);
  const resolverRef = useRef<((region: CropRegion | null) => void) | null>(null);
  const promptForCrop = useCallback((preview: CropPreview) => {
    return new Promise<CropRegion | null>((resolve) => {
      resolverRef.current = resolve;
      setCropPreview(preview);
      setCropPromptOpen(true);
    });
  }, []);
  const resolveCropPrompt = useCallback((region: CropRegion | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setCropPromptOpen(false);
    setCropPreview(null);
    if (resolver) resolver(region);
  }, []);
  return { cropPreview, cropPromptOpen, promptForCrop, resolveCropPrompt };
}
