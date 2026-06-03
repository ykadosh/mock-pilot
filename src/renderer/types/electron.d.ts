/* eslint-disable max-lines */
export {};

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  thumbnailStale?: boolean;
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

interface ConversationDisplayMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  type?: "message" | "thinking" | "tool" | "done";
}

interface ConversationAgentMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | object[];
  tool_calls?: unknown[];
  tool_call_id?: string;
}

interface ConversationSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface ConversationSession extends ConversationSessionMeta {
  displayMessages: ConversationDisplayMessage[];
  agentMessages: ConversationAgentMessage[];
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
      saveProjectConversation: (id: string, sessionId: string, payload: { displayMessages?: ConversationDisplayMessage[]; agentMessages?: ConversationAgentMessage[]; title?: string }) => Promise<{ success: boolean; session?: ConversationSession }>;
      loadProjectConversation: (id: string, sessionId: string) => Promise<{ success: boolean; session?: ConversationSession }>;
      listProjectConversations: (id: string) => Promise<{ success: boolean; sessions: ConversationSessionMeta[] }>;
      createProjectConversation: (id: string, title?: string) => Promise<{ success: boolean; session?: ConversationSession }>;
      deleteProjectConversation: (id: string, sessionId: string) => Promise<{ success: boolean }>;
      renameProject: (id: string, newTitle: string) => Promise<{ success: boolean }>;
      deleteProject: (id: string) => Promise<{ success: boolean }>;
      duplicateProject: (id: string) => Promise<{ success: boolean; project?: ProjectMeta }>;
      getProjectThumbnail: (id: string) => Promise<string | null>;
      regenerateProjectThumbnail: (id: string) => Promise<{ success: boolean; thumbnail?: string; error?: string }>;
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
      aiCancelRequest: () => Promise<{ success: boolean }>;
      // AI Agent
      aiAgentModify: (data: {
        prompt: string;
        fullHTML: string;
        projectId?: string;
        sessionId?: string;
        attachedElements?: { mpId: string; selector: string; outerHTML: string }[];
        images?: { id: string; name: string; dataUrl: string; mimeType: string; sizeBytes: number }[];
        attachedAssets?: {
          components: { id: string; label: string; html: string; description?: string; props?: { name: string; type: string; description: string }[] }[];
          typography: { id: string; label: string; fontFamily: string; fontSize: string; fontWeight: string; fontStyle: string; lineHeight: string; letterSpacing: string; textTransform: string }[];
          icons: { name: string; codepoint: string; fontFamily: string; renderMode: "codepoint" | "ligature" }[];
          graphics: { filename: string; extension: string; sizeBytes: number; assetPath: string }[];
          colors: { id: string; label: string; value: string }[];
        };
        projectAssets?: object;
        previousAgentMessages?: ConversationAgentMessage[];
        continueFromMaxIterations?: boolean;
      }) => Promise<{
        success: boolean;
        html?: string;
        summary?: string;
        iterations?: number;
        maxIterationsReached?: boolean;
        messages?: ConversationAgentMessage[];
        error?: string;
      }>;
      aiAgentCancel: () => Promise<{ success: boolean }>;
      onAiAgentProgress: (callback: (progress: {
        type: "tool_start" | "tool_end" | "iteration" | "complete" | "error" | "thinking" | "phase" | "html_update";
        toolName?: string;
        iteration?: number;
        maxIterations?: number;
        result?: string;
        error?: string;
        html?: string;
      }) => void) => () => void;
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
      getAppSettings: () => Promise<{ aiModel: string; maxIterations?: number }>;
      saveAppSettings: (settings: { aiModel: string; maxIterations?: number }) => Promise<{ success: boolean }>;
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
      extractIconFontGlyphs: (id: string) => Promise<{ success: boolean; fonts?: { family: string; glyphs: { codepoint: string; name: string }[] }[]; error?: string }>;
      listProjectGraphics: (id: string) => Promise<{ success: boolean; graphics?: GraphicAsset[] }>;
    };
  }
}
