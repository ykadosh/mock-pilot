import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: ["puppeteer"],
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    // Ensure Node.js built-in modules are not bundled
    browserField: false,
    mainFields: ["module", "main"],
  },
});
