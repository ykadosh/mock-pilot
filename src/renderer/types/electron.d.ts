export {};

declare global {
  interface Window {
    api: {
      captureWebsite: (url: string) => Promise<{
        success: boolean;
        html?: string;
        error?: string;
      }>;
    };
  }
}
