import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "MockPilot",
    executableName: "mock-pilot",
    icon: "resources/icon",
    extraResource: [
      "resources/app-icon-1024x1024.png",
      "resources/app-icon-512x512.png",
      "resources/app-icon-256x256.png",
      "resources/icon.ico",
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "MockPilot",
      setupExe: "MockPilot-Setup.exe",
      authors: "Yoav Kadosh",
      setupIcon: "resources/icon.ico",
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerDeb({}),
    new MakerRpm({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/main/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
        {
          entry: "src/main/webviewPreload.ts",
          config: "vite.webview-preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
