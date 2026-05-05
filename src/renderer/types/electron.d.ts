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
      deleteProject: (id: string) => Promise<{ success: boolean }>;
      getProjectThumbnail: (id: string) => Promise<string | null>;
    };
  }
}
