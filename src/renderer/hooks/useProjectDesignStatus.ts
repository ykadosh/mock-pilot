import { useEffect, useState } from "react";

/**
 * Tracks whether the current project has a non-empty `design.md`. Used by the
 * editor's PromptBox to show a "Design spec active" indicator so the user knows
 * their saved design guidance is being injected into every AI edit.
 */
export function useProjectDesignStatus(projectId: string | undefined) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!projectId) { setActive(false); return; }
    let cancelled = false;
    void window.api.getProjectDesign(projectId).then((result) => {
      if (cancelled) return;
      setActive(result.success && !!result.content && result.content.trim().length > 0);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  return active;
}
