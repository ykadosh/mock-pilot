import { useState, useCallback } from "react";

export interface HistoryEntry {
  html: string;
  label: string;
  timestamp: number;
}

export function useHistory(initialHtml?: string | null) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() =>
    initialHtml ? [{ html: initialHtml, label: "Initial", timestamp: Date.now() }] : []
  );
  const [pointer, setPointer] = useState(initialHtml ? 0 : -1);

  const currentHtml = pointer >= 0 && pointer < entries.length ? entries[pointer].html : null;

  const initialize = useCallback((html: string) => {
    setEntries([{ html, label: "Initial", timestamp: Date.now() }]);
    setPointer(0);
  }, []);

  const push = useCallback((html: string, label: string) => {
    setEntries((prev) => {
      // Truncate any forward history when pushing a new entry
      const truncated = prev.slice(0, (pointer >= 0 ? pointer : 0) + 1);
      return [...truncated, { html, label, timestamp: Date.now() }];
    });
    setPointer((prev) => prev + 1);
  }, [pointer]);

  const undo = useCallback(() => {
    setPointer((p) => Math.max(0, p - 1));
  }, []);

  const redo = useCallback(() => {
    setPointer((p) => Math.min(entries.length - 1, p + 1));
  }, [entries.length]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < entries.length) {
      setPointer(index);
    }
  }, [entries.length]);

  const canUndo = pointer > 0;
  const canRedo = pointer < entries.length - 1;

  return { entries, pointer, currentHtml, initialize, push, undo, redo, goTo, canUndo, canRedo };
}
