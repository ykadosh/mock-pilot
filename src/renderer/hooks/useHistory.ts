import { useState, useCallback, useRef, useEffect } from "react";

export interface HistoryEntry {
  html: string;
  label: string;
  timestamp: number;
}

export function useHistory(projectId?: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pointer, setPointer] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentHtml = pointer >= 0 && pointer < entries.length ? entries[pointer].html : null;

  // Load history from disk on mount
  useEffect(() => {
    if (!projectId) { setLoaded(true); return; }
    (async () => {
      const result = await window.api.loadProjectHistory(projectId);
      if (result.success && result.entries && result.htmlSnapshots) {
        const loaded = result.entries.map((e, i) => ({
          ...e,
          html: result.htmlSnapshots![i],
        }));
        setEntries(loaded);
        setPointer(result.pointer ?? loaded.length - 1);
      }
      setLoaded(true);
    })();
  }, [projectId]);

  // Debounced save to disk
  const saveToDisk = useCallback((newEntries: HistoryEntry[], newPointer: number) => {
    if (!projectId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      window.api.saveProjectHistory(projectId, {
        entries: newEntries.map(({ label, timestamp }) => ({ label, timestamp })),
        pointer: newPointer,
        htmlSnapshots: newEntries.map((e) => e.html),
      });
    }, 500);
  }, [projectId]);

  const initialize = useCallback((html: string) => {
    const newEntries = [{ html, label: "Initial", timestamp: Date.now() }];
    setEntries(newEntries);
    setPointer(0);
    saveToDisk(newEntries, 0);
  }, [saveToDisk]);

  const push = useCallback((html: string, label: string) => {
    setEntries((prev) => {
      const truncated = prev.slice(0, (pointer >= 0 ? pointer : 0) + 1);
      const newEntries = [...truncated, { html, label, timestamp: Date.now() }];
      const newPointer = newEntries.length - 1;
      setPointer(newPointer);
      saveToDisk(newEntries, newPointer);
      return newEntries;
    });
  }, [pointer, saveToDisk]);

  const undo = useCallback(() => {
    setPointer((p) => {
      const newP = Math.max(0, p - 1);
      saveToDisk(entries, newP);
      return newP;
    });
  }, [entries, saveToDisk]);

  const redo = useCallback(() => {
    setPointer((p) => {
      const newP = Math.min(entries.length - 1, p + 1);
      saveToDisk(entries, newP);
      return newP;
    });
  }, [entries, saveToDisk]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < entries.length) {
      setPointer(index);
      saveToDisk(entries, index);
    }
  }, [entries, saveToDisk]);

  const canUndo = pointer > 0;
  const canRedo = pointer < entries.length - 1;

  return { entries, pointer, currentHtml, initialize, push, undo, redo, goTo, canUndo, canRedo, loaded };
}
