export {};

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

interface TypographyAsset {
  id: string;
  label: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
}

interface ColorAsset { id: string; label: string; value: string }

interface GraphicAsset { filename: string; extension: string; sizeBytes: number }

interface ComponentAsset {
  id: string;
  label: string;
  html: string;
  count: number;
  hash: string;
  description?: string;
  props?: ComponentPropAsset[];
}

interface ComponentPropAsset { name: string; type: string; description: string }

interface ProjectAssets {
  typography: TypographyAsset[];
  colors: ColorAsset[];
  fontFaceCss?: string;
  icons?: { libraries: string[] };
  components?: ComponentAsset[];
  componentsCss?: string;
}

declare global {
  interface Window {
    api: {
      captureLog: (...args: unknown[]) => Promise<void>;
      captureWebviewIframes: (webContentsId: number) => Promise<{ success: boolean; iframes?: { url: string; html: string; childIframeSrcs: string[] }[]; error?: string }>;
      captureWebsite: (url: string) => Promise<{
        success: boolean;
        html?: string;
        thumbnail?: string;
        title?: string;
        error?: string;
      }>;
      formatHtml: (rawHtml: string) => Promise<{
        success: boolean;
        html?: string;
        error?: string;
      }>;
      getWebviewPreloadPath: () => Promise<string>;
      listProjects: () => Promise<ProjectMeta[]>;
      saveProject: (data: { url: string; title: string; html: string; thumbnail?: string }) => Promise<ProjectMeta & { fontFaceCss?: string | null }>;
      loadProject: (id: string) => Promise<{
        success: boolean;
        html?: string;
        assetsBasePath?: string;
        error?: string;
      }>;
      updateProjectHtml: (id: string, html: string) => Promise<{ success: boolean }>;
      saveProjectHistory: (id: string, data: { entries: { label: string; timestamp: number }[]; pointer: number; htmlSnapshots: string[] }) => Promise<{ success: boolean }>;
      loadProjectHistory: (id: string) => Promise<{
        success: boolean;
        entries?: { label: string; timestamp: number }[];
        pointer?: number;
        htmlSnapshots?: string[];
      }>;
      renameProject: (id: string, newTitle: string) => Promise<{ success: boolean }>;
      deleteProject: (id: string) => Promise<{ success: boolean }>;
      getProjectThumbnail: (id: string) => Promise<string | null>;
      aiModifyElement: (data: { prompt: string; outerHTML: string; computedStyle: Record<string, string> }) => Promise<{
        success: boolean;
        html?: string;
        error?: string;
      }>;
      aiModifyPage: (data: { prompt: string; fullHTML: string; images?: { name: string; dataUrl: string }[] }) => Promise<{
        success: boolean;
        html?: string;
        error?: string;
      }>;
      aiExtractComponents: (data: { simplifiedHtml: string; screenshot?: string }) => Promise<{
        success: boolean;
        components?: { name: string; selector: string; count: number; description: string; props: { name: string; type: string; description: string }[] }[];
        error?: string;
      }>;
      // Auth
      authGetStatus: () => Promise<{ authenticated: boolean; login?: string; avatar_url?: string }>;
      authStartDeviceFlow: () => Promise<{
        success: boolean;
        user_code?: string;
        device_code?: string;
        interval?: number;
        expires_in?: number;
        error?: string;
      }>;
      authPollDeviceFlow: (deviceCode: string) => Promise<{
        status: "pending" | "slow_down" | "success" | "error";
        login?: string;
        avatar_url?: string;
        error?: string;
      }>;
      authLogout: () => Promise<{ success: boolean }>;
      authCheckGhCli: () => Promise<{ connected: boolean; login?: string }>;
      // App settings
      getAppSettings: () => Promise<{ aiModel: string }>;
      saveAppSettings: (settings: { aiModel: string }) => Promise<{ success: boolean }>;
      getStorageInfo: () => Promise<{ totalBytes: number; projectCount: number }>;
      getProjectSize: (id: string) => Promise<{ totalBytes: number }>;
      // Updates
      checkForUpdates: () => Promise<{
        updateAvailable: boolean;
        currentVersion?: string;
        latestVersion?: string;
        releaseUrl?: string;
        downloadUrl?: string;
        error?: string;
      }>;
      openExternal: (url: string) => Promise<void>;
      openProjectInBrowser: (id: string) => Promise<{ success: boolean; error?: string }>;
      getAppVersion: () => Promise<string>;
      // Export
      exportSaveFiles: (data: { projectId: string; html: string; baseUrl?: string }) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      exportAsImage: (data: { html: string; width: number; height: number; baseUrl?: string; projectId?: string }) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      deployToCodesandbox: (data: { html: string; css?: string; baseUrl?: string }) => Promise<{
        success: boolean;
        error?: string;
      }>;
      deployToStackblitz: (data: { html: string; css?: string; baseUrl?: string }) => Promise<{
        success: boolean;
        error?: string;
      }>;
      // Project assets
      saveProjectAssets: (id: string, assets: ProjectAssets) => Promise<{ success: boolean }>;
      loadProjectAssets: (id: string) => Promise<{ success: boolean; assets?: ProjectAssets }>;
      listProjectGraphics: (id: string) => Promise<{ success: boolean; graphics?: GraphicAsset[] }>;
    };
  }
}
