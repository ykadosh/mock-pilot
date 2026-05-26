import { useState, useImperativeHandle, forwardRef } from "react";

interface ColorFormValues {
  label: string;
  value: string;
}

interface ColorFormProps {
  initial?: ColorFormValues;
  onSave: (values: ColorFormValues) => void;
}

export interface ColorFormRef {
  submit: () => void;
}

export const ColorForm = forwardRef<ColorFormRef, ColorFormProps>(function ColorForm({ initial, onSave }, ref) {
  const [label, setLabel] = useState(initial?.label || "");
  const [value, setValue] = useState(initial?.value || "#000000");

  useImperativeHandle(ref, () => ({
    submit: () => onSave({ label, value }),
  }));

  return (
    <div className="space-y-4">
      <ColorValueField value={value} onChange={setValue} />
      <ColorLabelField value={label} onChange={setLabel} />
      <ColorPreview value={value} label={label} />
    </div>
  );
});

function ColorValueField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="font-ui-small text-ui-small text-on-surface-variant mb-1.5 block font-medium">Color</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 cursor-pointer rounded-lg border-none"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="border-outline-variant bg-surface text-on-surface text-ui-small focus:border-primary flex-1 rounded-lg border px-3 py-2 font-mono transition-colors focus:outline-none"
        />
      </div>
    </div>
  );
}

function ColorLabelField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="font-ui-small text-ui-small text-on-surface-variant mb-1.5 block font-medium">Label</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional name"
        className="border-outline-variant bg-surface text-on-surface text-ui-small focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none"
      />
    </div>
  );
}

function ColorPreview({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-outline/20 bg-surface-variant/30 rounded-lg border p-4">
      <p className="text-ui-small text-outline mb-3">Preview</p>
      <div className="flex items-center gap-3">
        <div
          className="h-16 w-16 rounded-lg shadow-md"
          style={{ backgroundColor: value }}
        />
        <div>
          <p className="text-on-surface font-medium">{label || "Untitled Color"}</p>
          <p className="text-ui-small text-outline font-mono">{value}</p>
        </div>
      </div>
    </div>
  );
}
