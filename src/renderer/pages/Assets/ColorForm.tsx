import { useState, type FormEvent } from "react";

interface ColorFormValues {
  label: string;
  value: string;
}

interface ColorFormProps {
  initial?: ColorFormValues;
  onSave: (values: ColorFormValues) => void;
  onCancel: () => void;
}

export function ColorForm({ initial, onSave, onCancel }: ColorFormProps) {
  const [label, setLabel] = useState(initial?.label || "");
  const [value, setValue] = useState(initial?.value || "#000000");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({ label, value });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3">
      <ColorValueField value={value} onChange={setValue} />
      <ColorLabelField value={label} onChange={setLabel} />
      <ColorFormActions onCancel={onCancel} />
    </form>
  );
}

function ColorValueField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-none"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-outline/30 bg-background text-on-surface text-ui-small flex-1 rounded border px-2 py-1 font-mono"
        />
      </div>
    </div>
  );
}

function ColorLabelField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">Label</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional name"
        className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1"
      />
    </div>
  );
}

function ColorFormActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="text-ui-small text-outline hover:text-on-surface px-3 py-1.5"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="bg-primary text-on-primary text-ui-small rounded px-3 py-1.5 font-medium hover:opacity-90"
      >
        Save
      </button>
    </div>
  );
}
