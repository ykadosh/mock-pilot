import { useCallback, useEffect, useState } from "react";

export type DesignStatus = "idle" | "loading" | "saving" | "generating" | "saved" | "error";

interface LoadSetters {
  setContent: (v: string) => void;
  setOriginal: (v: string) => void;
  setStatus: (v: DesignStatus) => void;
  setError: (v: string | null) => void;
}

function useDesignLoad(projectId: string | undefined, setters: LoadSetters) {
  const { setContent, setOriginal, setStatus, setError } = setters;
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
        setStatus("idle");
      } else {
        setError(result.error ?? "Failed to load design.md");
        setStatus("error");
      }
    });
    return () => { cancelled = true; };
  }, [projectId, setContent, setError, setOriginal, setStatus]);
}

export function useDesignDoc(projectId: string | undefined) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [status, setStatus] = useState<DesignStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useDesignLoad(projectId, { setContent, setOriginal, setStatus, setError });

  const save = useCallback(async () => {
    if (!projectId) return;
    setStatus("saving"); setError(null);
    const result = await window.api.saveProjectDesign(projectId, content);
    if (result.success) {
      setOriginal(content);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    } else {
      setError(result.error ?? "Failed to save");
      setStatus("error");
    }
  }, [content, projectId]);

  const generate = useCallback(async () => {
    if (!projectId) return;
    setStatus("generating"); setError(null);
    const result = await window.api.generateProjectDesign(projectId);
    if (result.success && result.content) {
      setContent(result.content);
      setStatus("idle");
    } else {
      setError(result.error ?? "Generation failed");
      setStatus("error");
    }
  }, [projectId]);

  const dirty = content !== original;
  return { content, setContent, status, error, save, generate, dirty, hasSaved: original.trim().length > 0 };
}
