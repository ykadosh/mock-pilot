export {};

interface ProjectMeta {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

declare global {
  interface Window {
    api: {
      captureWebsite: (url: string) => Promise<{
        success: boolean;
        html?: string;
        thumbnail?: string;
        error?: string;
      }>;
      listProjects: () => Promise<ProjectMeta[]>;
      saveProject: (data: { url: string; title: string; html: string; thumbnail?: string }) => Promise<ProjectMeta>;
      loadProject: (id: string) => Promise<{
        success: boolean;
        html?: string;
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
    };
  }
}
