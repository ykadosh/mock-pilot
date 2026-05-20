import { useEffect } from "react";

const ICON_FONT_CDN_URLS: Record<string, string> = {
  "font-awesome": "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "material-icons": "https://fonts.googleapis.com/icon?family=Material+Icons|Material+Symbols+Outlined",
  "bootstrap-icons": "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
  "remix-icons": "https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css",
};

/**
 * Loads icon font CSS from CDN for the detected libraries so that
 * icons render correctly on the Icons page.
 */
export function useIconFonts(libraryIds: string[]) {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    for (const id of libraryIds) {
      const url = ICON_FONT_CDN_URLS[id];
      if (!url) continue;
      // Skip if already loaded
      if (document.querySelector(`link[data-icon-font="${id}"]`)) continue;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.setAttribute("data-icon-font", id);
      document.head.appendChild(link);
      links.push(link);
    }

    return () => {
      for (const link of links) {
        document.head.removeChild(link);
      }
    };
  }, [libraryIds]);
}
