import { useEffect, useState } from "react";
import type { ProjectMeta } from "./Settings.types";
import { formatStorageValue, getTimeSince } from "./Settings.utils";

function useTimedFlag(timeoutMs = 2000) {
  const [value, setValue] = useState(false);

  const trigger = () => {
    setValue(true);
    setTimeout(() => setValue(false), timeoutMs);
  };

  return [value, trigger] as const;
}

function useProjectDetails(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [projectSize, setProjectSize] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;

    window.api.listProjects().then((projects) => {
      const foundProject = projects.find((projectItem) => projectItem.id === projectId);
      if (foundProject) setProject(foundProject);
    });
    window.api.getProjectSize(projectId).then((info) => setProjectSize(info.totalBytes));
  }, [projectId]);

  return { project, projectSize, setProject };
}

function useProjectName(project: ProjectMeta | null) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (project) setName(project.title);
  }, [project]);

  return { hasChanges: Boolean(project && name.trim() !== "" && name !== project.title), name, setName };
}

interface UseProjectActionsArgs {
  hasChanges: boolean;
  markNameSaved: () => void;
  markUrlCopied: () => void;
  name: string;
  onDeleteSuccess: () => void;
  project: ProjectMeta | null;
  projectId: string | undefined;
  setName: (value: string) => void;
  setProject: React.Dispatch<React.SetStateAction<ProjectMeta | null>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
}

function useProjectActions({
  hasChanges,
  markNameSaved,
  markUrlCopied,
  name,
  onDeleteSuccess,
  project,
  projectId,
  setName,
  setProject,
  setShowDeleteDialog,
}: UseProjectActionsArgs) {
  const handleDiscard = () => project && setName(project.title);
  const handleCopyUrl = () => {
    if (!project?.url) return;
    navigator.clipboard.writeText(project.url);
    markUrlCopied();
  };
  const handleRename = async () => {
    if (!projectId || !hasChanges) return;
    const nextName = name.trim();
    await window.api.renameProject(projectId, nextName);
    setProject((current) => (current ? { ...current, title: nextName } : current));
    markNameSaved();
  };
  const handleDelete = async () => {
    if (!projectId) return;
    await window.api.deleteProject(projectId);
    setShowDeleteDialog(false);
    onDeleteSuccess();
  };

  return { handleCopyUrl, handleDelete, handleDiscard, handleRename };
}

export function useSettingsController(projectId: string | undefined, onDeleteSuccess: () => void) {
  const { project, projectSize, setProject } = useProjectDetails(projectId);
  const { hasChanges, name, setName } = useProjectName(project);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [nameSaved, markNameSaved] = useTimedFlag();
  const [urlCopied, markUrlCopied] = useTimedFlag();
  const actions = useProjectActions({ hasChanges, markNameSaved, markUrlCopied, name, onDeleteSuccess, project, projectId, setName, setProject, setShowDeleteDialog });

  return {
    ...actions,
    createdDate: project ? new Date(project.createdAt) : null,
    hasChanges,
    lastUpdated: project ? new Date(project.updatedAt) : null,
    name,
    nameSaved,
    project,
    setName,
    setShowDeleteDialog,
    showDeleteDialog,
    storage: projectSize === null ? null : formatStorageValue(projectSize),
    timeSinceUpdate: project ? getTimeSince(new Date(project.updatedAt)) : null,
    urlCopied,
  };
}
