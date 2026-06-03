import { useEffect, useRef, useState } from "react";

interface Props {
  currentLabel: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}

export function ComponentRenameInput({ currentLabel, onSave, onCancel }: Props) {
  const [value, setValue] = useState(currentLabel);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(value.trim() || currentLabel); }} className="flex gap-1">
      <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onBlur={onCancel} className="border-outline/30 bg-background text-on-surface w-full rounded border px-2 py-0.5 text-sm" />
    </form>
  );
}
