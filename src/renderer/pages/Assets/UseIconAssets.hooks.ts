import { useEffect, useState } from "react";

export function useIconAssets(projectId?: string) {
  const [detectedLibraries, setDetectedLibraries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      const result = await window.api.loadProjectAssets(projectId);
      if (result.success && result.assets?.icons?.libraries) {
        setDetectedLibraries(result.assets.icons.libraries);
      } else {
        setDetectedLibraries([]);
      }
      setLoading(false);
    })();
  }, [projectId]);

  return { detectedLibraries, loading };
}
