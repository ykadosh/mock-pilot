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
        error?: string;
      }>;
      listProjects: () => Promise<ProjectMeta[]>;
      saveProject: (data: { url: string; title: string; html: string }) => Promise<ProjectMeta>;
      loadProject: (id: string) => Promise<{
        success: boolean;
        html?: string;
        error?: string;
      }>;
    };
  }
}
