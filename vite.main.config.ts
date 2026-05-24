import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["puppeteer", "opentype.js", "wawoff2"],
    },
  },
  resolve: {
    // Ensure Node.js built-in modules are not bundled
    browserField: false,
    mainFields: ["module", "main"],
  },
});
