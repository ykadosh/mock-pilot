import { useCallback, useEffect, useRef, useState } from "react";

export type DesignStatus = "idle" | "loading" | "saving" | "generating" | "saved" | "error";

interface LoadSetters {
  setContent: (v: string) => void;
  setOriginal: (v: string) => void;
  setStatus: (v: DesignStatus) => void;
  setError: (v: string | null) => void;
  setEnabled: (v: boolean) => void;
}

function useDesignLoad(projectId: string | undefined, setters: LoadSetters) {
  const { setContent, setOriginal, setStatus, setError, setEnabled } = setters;
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setStatus("loading");
    setError(null);
    void window.api.getProjectDesign(projectId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setContent(result.content ?? "");
        setOriginal(result.content ?? "");
        setEnabled(result.enabled !== false);
        setStatus("idle");
      } else {
        setError(result.error ?? "Failed to load design.md");
        setStatus("error");
      }
    });
    return () => { cancelled = true; };
  }, [projectId, setContent, setError, setOriginal, setStatus, setEnabled]);
}

interface SaveSetters {
  setOriginal: (v: string) => void;
  setStatus: (v: DesignStatus) => void;
  setError: (v: string | null) => void;
}

function useSave(projectId: string | undefined, content: string, setters: SaveSetters) {
  const { setOriginal, setStatus, setError } = setters;
  return useCallback(async () => {
    if (!projectId) return;
    setStatus("saving"); setError(null);
    const result = await window.api.saveProjectDesign(projectId, content);
    if (result.success) {
      setOriginal(content);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setError(result.error ?? "Failed to save");
      setStatus("error");
    }
  }, [content, projectId, setOriginal, setStatus, setError]);
}

interface GenerateState {
  projectId: string | undefined;
  setContent: (v: string) => void;
  setOriginal: (v: string) => void;
  setStatus: (v: DesignStatus) => void;
  setError: (v: string | null) => void;
  setStage: (v: string) => void;
}

function describeStage(stage: string, message?: string): string {
  if (message) return message;
  if (stage === "preparing") return "Loading captured assets…";
  if (stage === "prompting") return "Asking the model…";
  if (stage === "streaming") return "Writing your design spec…";
  if (stage === "saving") return "Saving design.md…";
  return "";
}

function useGenerate(state: GenerateState) {
  const { projectId, setContent, setOriginal, setStatus, setError, setStage } = state;
  return useCallback(async () => {
    if (!projectId) return;
    setStatus("generating"); setError(null); setStage("Preparing…");
    const unsubscribe = window.api.onDesignGenerationProgress((progress) => {
      if (progress.projectId !== projectId) return;
      if (progress.stage === "error") { setError(progress.error ?? "Generation failed"); return; }
      setStage(describeStage(progress.stage, progress.message));
      if (typeof progress.content === "string") setContent(progress.content);
    });
    try {
      const result = await window.api.generateProjectDesign(projectId);
      if (result.success && result.content) {
        setContent(result.content);
        setOriginal(result.content);
        setStatus("saved");
        setStage("");
        setTimeout(() => setStatus("idle"), 1500);
      } else {
        setError(result.error ?? "Generation failed");
        setStatus("error");
        setStage("");
      }
    } finally {
      unsubscribe();
    }
  }, [projectId, setContent, setOriginal, setStatus, setError, setStage]);
}

export function useDesignDoc(projectId: string | undefined) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [status, setStatus] = useState<DesignStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [enabled, setEnabledState] = useState(true);
  const cancelRef = useRef(() => { void window.api.cancelDesignGeneration(); });

  useDesignLoad(projectId, { setContent, setOriginal, setStatus, setError, setEnabled: setEnabledState });
  const save = useSave(projectId, content, { setOriginal, setStatus, setError });
  const generate = useGenerate({ projectId, setContent, setOriginal, setStatus, setError, setStage });

  const setEnabled = useCallback(async (next: boolean) => {
    if (!projectId) return;
    setEnabledState(next);
    const result = await window.api.setProjectDesignEnabled(projectId, next);
    if (!result.success) {
      setEnabledState(!next);
      setError(result.error ?? "Failed to update toggle");
    }
  }, [projectId]);

  useEffect(() => () => { cancelRef.current(); }, []);

  const dirty = content !== original;
  return { content, setContent, status, stage, error, save, generate, dirty, enabled, setEnabled, hasSaved: original.trim().length > 0 };
}
