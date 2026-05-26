export interface SavedProject {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  thumbnailStale?: boolean;
}
