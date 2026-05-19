import { useState, useCallback, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface HistoryEntry {
  html: string;
  label: string;
  timestamp: number;
}

function mergeHistoryEntries(result: Awaited<ReturnType<typeof window.api.loadProjectHistory>>) {
  if (!result.success || !result.entries || !result.htmlSnapshots) {
    return null;
  }

  const htmlSnapshots = result.htmlSnapshots;
  return result.entries.map((entry, index) => ({
    ...entry,
    html: htmlSnapshots[index],
  }));
}

function useHistoryLoader({
  projectId,
  setEntries,
  setPointer,
  setLoaded,
}: {
  projectId: string | undefined;
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPointer: Dispatch<SetStateAction<number>>;
  setLoaded: Dispatch<SetStateAction<boolean>>;
}) {
  useEffect(() => {
    if (!projectId) {
      setLoaded(true);
      return;
    }

    (async () => {
      const result = await window.api.loadProjectHistory(projectId);
      const loadedEntries = mergeHistoryEntries(result);
      if (loadedEntries) {
        setEntries(loadedEntries);
        setPointer(result.pointer ?? loadedEntries.length - 1);
      }
      setLoaded(true);
    })();
  }, [projectId, setEntries, setLoaded, setPointer]);
}

function useHistorySaver(projectId?: string) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((newEntries: HistoryEntry[], newPointer: number) => {
    if (!projectId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      window.api.saveProjectHistory(projectId, {
        entries: newEntries.map(({ label, timestamp }) => ({ label, timestamp })),
        pointer: newPointer,
        htmlSnapshots: newEntries.map((entry) => entry.html),
      });
    }, 500);
  }, [projectId]);
}

function useHistoryInitialization({
  setEntries,
  setPointer,
  saveToDisk,
}: {
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPointer: Dispatch<SetStateAction<number>>;
  saveToDisk: (newEntries: HistoryEntry[], newPointer: number) => void;
}) {
  return useCallback((html: string) => {
    const newEntries = [{ html, label: "Initial", timestamp: Date.now() }];
    setEntries(newEntries);
    setPointer(0);
    saveToDisk(newEntries, 0);
  }, [saveToDisk, setEntries, setPointer]);
}

function useHistoryPush({
  pointer,
  setEntries,
  setPointer,
  saveToDisk,
}: {
  pointer: number;
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPointer: Dispatch<SetStateAction<number>>;
  saveToDisk: (newEntries: HistoryEntry[], newPointer: number) => void;
}) {
  return useCallback((html: string, label: string) => {
    setEntries((prev) => {
      const truncated = prev.slice(0, (pointer >= 0 ? pointer : 0) + 1);
      const newEntries = [...truncated, { html, label, timestamp: Date.now() }];
      const newPointer = newEntries.length - 1;
      setPointer(newPointer);
      saveToDisk(newEntries, newPointer);
      return newEntries;
    });
  }, [pointer, saveToDisk, setEntries, setPointer]);
}

function useHistoryTraversal({
  entries,
  setPointer,
  saveToDisk,
}: {
  entries: HistoryEntry[];
  setPointer: Dispatch<SetStateAction<number>>;
  saveToDisk: (newEntries: HistoryEntry[], newPointer: number) => void;
}) {
  const undo = useCallback(() => {
    setPointer((currentPointer) => {
      const newPointer = Math.max(0, currentPointer - 1);
      saveToDisk(entries, newPointer);
      return newPointer;
    });
  }, [entries, saveToDisk, setPointer]);

  const redo = useCallback(() => {
    setPointer((currentPointer) => {
      const newPointer = Math.min(entries.length - 1, currentPointer + 1);
      saveToDisk(entries, newPointer);
      return newPointer;
    });
  }, [entries, saveToDisk, setPointer]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < entries.length) {
      setPointer(index);
      saveToDisk(entries, index);
    }
  }, [entries, saveToDisk, setPointer]);

  return { undo, redo, goTo };
}

export function useHistory(projectId?: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pointer, setPointer] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const saveToDisk = useHistorySaver(projectId);

  useHistoryLoader({ projectId, setEntries, setPointer, setLoaded });

  const initialize = useHistoryInitialization({ setEntries, setPointer, saveToDisk });
  const push = useHistoryPush({ pointer, setEntries, setPointer, saveToDisk });
  const { undo, redo, goTo } = useHistoryTraversal({ entries, setPointer, saveToDisk });

  return {
    entries,
    pointer,
    currentHtml: pointer >= 0 && pointer < entries.length ? entries[pointer].html : null,
    initialize,
    push,
    undo,
    redo,
    goTo,
    canUndo: pointer > 0,
    canRedo: pointer < entries.length - 1,
    loaded,
  };
}
