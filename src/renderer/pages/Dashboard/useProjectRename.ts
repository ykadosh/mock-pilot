import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SavedProject } from "./Dashboard.types";

interface UseProjectRenameResult {
  renameTarget: SavedProject | null;
  renameValue: string;
  setRenameValue: Dispatch<SetStateAction<string>>;
  clearRenameTarget: () => void;
  startRename: (project: SavedProject) => void;
  submitRename: () => Promise<void>;
}

export function useProjectRename(
  setSavedProjects: Dispatch<SetStateAction<SavedProject[]>>
): UseProjectRenameResult {
  const [renameTarget, setRenameTarget] = useState<SavedProject | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return {
    renameTarget,
    renameValue,
    setRenameValue,
    clearRenameTarget: () => setRenameTarget(null),
    startRename: (project) => {
      setRenameTarget(project);
      setRenameValue(project.title);
    },
    submitRename: async () => {
      const nextTitle = renameValue.trim();
      if (!renameTarget || !nextTitle) return;
      await window.api.renameProject(renameTarget.id, nextTitle);
      setSavedProjects((projects) =>
        projects.map((project) => (project.id === renameTarget.id ? { ...project, title: nextTitle } : project))
      );
      setRenameTarget(null);
    },
  };
}
