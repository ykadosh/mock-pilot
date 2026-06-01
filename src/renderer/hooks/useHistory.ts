import { useState, useCallback, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface HistoryEntry {
  html: string;
  label: string;
  timestamp: number;
}

function mergeHistoryEntries(result: Awaited<ReturnType<typeof window.api.loadProjectHistory>>) {
  if (!result.success || !result.entries || !result.htmlSnapshots) return null;
  const htmlSnapshots = result.htmlSnapshots;
  return result.entries.map((entry, index) => ({ ...entry, html: htmlSnapshots[index] }));
}

function useHistoryLoader({ projectId, setEntries, setPointer, setLoaded, bumpReloadEpoch }: {
  projectId: string | undefined;
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPointer: Dispatch<SetStateAction<number>>;
  setLoaded: Dispatch<SetStateAction<boolean>>;
  bumpReloadEpoch: () => void;
}) {
  useEffect(() => {
    if (!projectId) { setLoaded(true); return; }
    (async () => {
      const result = await window.api.loadProjectHistory(projectId);
      const loadedEntries = mergeHistoryEntries(result);
      if (loadedEntries) {
        setEntries(loadedEntries);
        setPointer(result.pointer ?? loadedEntries.length - 1);
        bumpReloadEpoch();
      }
      setLoaded(true);
    })();
  }, [bumpReloadEpoch, projectId, setEntries, setLoaded, setPointer]);
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

interface HistoryOpsArgs {
  setEntries: Dispatch<SetStateAction<HistoryEntry[]>>;
  setPointer: Dispatch<SetStateAction<number>>;
  saveToDisk: (newEntries: HistoryEntry[], newPointer: number) => void;
  bumpReloadEpoch: () => void;
}

function useHistoryInitialization({ setEntries, setPointer, saveToDisk, bumpReloadEpoch }: HistoryOpsArgs) {
  return useCallback((html: string) => {
    const newEntries = [{ html, label: "Initial", timestamp: Date.now() }];
    setEntries(newEntries);
    setPointer(0);
    bumpReloadEpoch();
    saveToDisk(newEntries, 0);
  }, [bumpReloadEpoch, saveToDisk, setEntries, setPointer]);
}

function useHistoryPush({ pointer, setEntries, setPointer, saveToDisk }: Omit<HistoryOpsArgs, "bumpReloadEpoch"> & { pointer: number }) {
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

function useHistoryTraversal({ entries, setPointer, saveToDisk, bumpReloadEpoch }: Omit<HistoryOpsArgs, "setEntries"> & { entries: HistoryEntry[] }) {
  const undo = useCallback(() => {
    setPointer((cur) => {
      const next = Math.max(0, cur - 1);
      if (next !== cur) bumpReloadEpoch();
      saveToDisk(entries, next);
      return next;
    });
  }, [bumpReloadEpoch, entries, saveToDisk, setPointer]);
  const redo = useCallback(() => {
    setPointer((cur) => {
      const next = Math.min(entries.length - 1, cur + 1);
      if (next !== cur) bumpReloadEpoch();
      saveToDisk(entries, next);
      return next;
    });
  }, [bumpReloadEpoch, entries, saveToDisk, setPointer]);
  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= entries.length) return;
    setPointer(index);
    bumpReloadEpoch();
    saveToDisk(entries, index);
  }, [bumpReloadEpoch, entries, saveToDisk, setPointer]);
  return { undo, redo, goTo };
}

export function useHistory(projectId?: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [pointer, setPointer] = useState(-1);
  const [loaded, setLoaded] = useState(false);
  const [reloadEpoch, setReloadEpoch] = useState(0);
  const saveToDisk = useHistorySaver(projectId);
  const pointerRef = useRef(pointer);
  useEffect(() => { pointerRef.current = pointer; }, [pointer]);
  const bumpReloadEpoch = useCallback(() => setReloadEpoch((v) => v + 1), []);

  useHistoryLoader({ projectId, setEntries, setPointer, setLoaded, bumpReloadEpoch });

  const initialize = useHistoryInitialization({ setEntries, setPointer, saveToDisk, bumpReloadEpoch });
  const push = useHistoryPush({ pointer, setEntries, setPointer, saveToDisk });
  const { undo, redo, goTo } = useHistoryTraversal({ entries, setPointer, saveToDisk, bumpReloadEpoch });
  const replaceCurrent = useCallback((html: string) => {
    setEntries((prev) => {
      const p = pointerRef.current;
      if (p < 0 || p >= prev.length || prev[p].html === html) return prev;
      const next = prev.slice();
      next[p] = { ...next[p], html };
      saveToDisk(next, p);
      return next;
    });
  }, [saveToDisk]);

  return {
    entries, pointer,
    currentHtml: pointer >= 0 && pointer < entries.length ? entries[pointer].html : null,
    reloadEpoch,
    initialize, push, replaceCurrent, undo, redo, goTo,
    canUndo: pointer > 0,
    canRedo: pointer < entries.length - 1,
    loaded,
  };
}
