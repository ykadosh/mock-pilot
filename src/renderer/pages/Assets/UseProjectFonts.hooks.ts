import { useEffect } from "react";

/**
 * Loads @font-face CSS from the project's stored assets and injects it
 * into the current document so typography previews render with the correct fonts.
 */
export function useProjectFonts(projectId?: string) {
  useEffect(() => {
    if (!projectId) return;

    let styleElement: HTMLStyleElement | null = null;

    void (async () => {
      const result = await window.api.loadProjectAssets(projectId);
      if (!result.success || !result.assets?.fontFaceCss) return;

      // Rewrite relative asset paths to use the mp-asset:// protocol
      const resolvedCss = result.assets.fontFaceCss.replace(
        /url\(\s*["']?([^"')]+)["']?\s*\)/g,
        (_match, url: string) => {
          if (url.startsWith("data:") || url.startsWith("http") || url.startsWith("mp-asset://")) {
            return `url("${url}")`;
          }
          return `url("mp-asset://assets/${projectId}/${url}")`;
        },
      );

      styleElement = document.createElement("style");
      styleElement.setAttribute("data-project-fonts", projectId);
      styleElement.textContent = resolvedCss;
      document.head.appendChild(styleElement);
    })();

    return () => {
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, [projectId]);
}
