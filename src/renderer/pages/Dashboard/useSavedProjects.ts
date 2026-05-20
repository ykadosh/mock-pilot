import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SavedProject } from "./Dashboard.types";

export function useSavedProjects() {
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  useEffect(() => {
    void loadProjects(setSavedProjects);
  }, []);

  return { savedProjects, setSavedProjects };
}

async function loadProjects(setSavedProjects: Dispatch<SetStateAction<SavedProject[]>>) {
  const projects = await window.api.listProjects();
  const withThumbnails = await Promise.all(
    projects.map(async (project) => ({
      ...project,
      thumbnail: (await window.api.getProjectThumbnail(project.id)) || undefined,
    }))
  );

  withThumbnails.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  setSavedProjects(withThumbnails);
}
