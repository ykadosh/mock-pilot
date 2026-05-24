import { useEffect, useState } from "react";

import { parseFontFaceCss } from "./fontFaceParser";

export interface IconFontGlyphData {
  family: string;
  glyphs: { codepoint: string; name: string }[];
}

export function useProjectIconFonts(projectId?: string) {
  const [iconFontsData, setIconFontsData] = useState<IconFontGlyphData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      const result = await window.api.extractIconFontGlyphs(projectId);
      if (result.success && result.fonts) {
        setIconFontsData(result.fonts);
      } else {
        const assetsResult = await window.api.loadProjectAssets(projectId);
        const parsed = parseFontFaceCss(assetsResult.success ? assetsResult.assets?.fontFaceCss : null);
        const fallback = [...parsed.iconFonts.entries()].map(([family]) => ({ family, glyphs: [] }));
        setIconFontsData(fallback);
      }
      setLoading(false);
    })();
  }, [projectId]);

  return { iconFontsData, loading };
}
