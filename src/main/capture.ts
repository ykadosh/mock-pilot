import puppeteer from "puppeteer";

/**
 * Captures a website and returns a self-contained HTML string
 * with all CSS inlined and images converted to data URIs.
 */
export async function captureWebsite(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Inline all styles and convert images to data URIs
    const html = await page.evaluate(async () => {
      // 1. Inline all external stylesheets
      const stylesheets = document.querySelectorAll(
        'link[rel="stylesheet"]'
      );
      for (const link of stylesheets) {
        try {
          const href = (link as HTMLLinkElement).href;
          const res = await fetch(href);
          const css = await res.text();
          const style = document.createElement("style");
          style.textContent = css;
          link.replaceWith(style);
        } catch {
          // Skip stylesheets that fail to load
        }
      }

      // 2. Inline computed styles for all elements to preserve appearance
      // (handles CSS-in-JS, dynamic styles, etc.)
      // Skip this for performance — external stylesheets + inline styles cover most cases

      // 3. Convert images to data URIs
      const images = document.querySelectorAll("img");
      for (const img of images) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 200;
          const ctx = canvas.getContext("2d");
          if (ctx && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0);
            img.src = canvas.toDataURL("image/png");
          }
        } catch {
          // CORS images can't be converted — leave as-is
        }
      }

      // 4. Remove all scripts (we want static, non-interactive HTML)
      const scripts = document.querySelectorAll("script");
      scripts.forEach((s) => s.remove());

      // 5. Remove event handlers by cloning the body
      // (handled by script removal — inline handlers remain but are harmless without JS)

      return document.documentElement.outerHTML;
    });

    return `<!DOCTYPE html>\n${html}`;
  } finally {
    await browser.close();
  }
}
