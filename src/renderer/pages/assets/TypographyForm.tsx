import { useState, type FormEvent } from "react";

type TypographyFormValues = Omit<TypographyAsset, "id">;

interface TypographyFormProps {
  initial?: TypographyFormValues;
  onSave: (values: TypographyFormValues) => void;
  onCancel: () => void;
}

interface TypographyFieldConfig {
  key: keyof TypographyFormValues;
  label: string;
  options?: readonly string[];
}

const DEFAULT_VALUES: TypographyFormValues = {
  label: "",
  fontFamily: "sans-serif",
  fontSize: "16px",
  fontWeight: "400",
  fontStyle: "normal",
  lineHeight: "normal",
  letterSpacing: "normal",
  textTransform: "none",
};

const TYPOGRAPHY_FIELDS: readonly TypographyFieldConfig[] = [
  { key: "label", label: "Label" },
  { key: "fontFamily", label: "Font Family" },
  { key: "fontSize", label: "Font Size" },
  { key: "fontWeight", label: "Font Weight" },
  { key: "fontStyle", label: "Font Style", options: ["normal", "italic"] },
  { key: "lineHeight", label: "Line Height" },
  { key: "letterSpacing", label: "Letter Spacing" },
  { key: "textTransform", label: "Text Transform", options: ["none", "uppercase", "lowercase", "capitalize"] },
];

export function TypographyForm({ initial, onSave, onCancel }: TypographyFormProps) {
  const [values, setValues] = useState<TypographyFormValues>({ ...DEFAULT_VALUES, ...initial });

  const handleChange = (key: keyof TypographyFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(values);
  };

  return (
    <form onSubmit={handleSubmit} className="border-outline/20 bg-surface mb-3 space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        {TYPOGRAPHY_FIELDS.map((field) => (
          <TypographyFormField key={field.key} config={field} value={values[field.key]} onChange={handleChange} />
        ))}
      </div>
      <TypographyFormActions onCancel={onCancel} />
    </form>
  );
}

function TypographyFormField({
  config,
  value,
  onChange,
}: {
  config: TypographyFieldConfig;
  value: string;
  onChange: (key: keyof TypographyFormValues, value: string) => void;
}) {
  return config.options ? (
    <TypographySelectField config={config} value={value} onChange={onChange} />
  ) : (
    <TypographyTextField config={config} value={value} onChange={onChange} />
  );
}

function TypographyTextField({
  config,
  value,
  onChange,
}: {
  config: TypographyFieldConfig;
  value: string;
  onChange: (key: keyof TypographyFormValues, value: string) => void;
}) {
  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">{config.label}</label>
      <input
        value={value}
        onChange={(event) => onChange(config.key, event.target.value)}
        className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1"
      />
    </div>
  );
}

function TypographySelectField({
  config,
  value,
  onChange,
}: {
  config: TypographyFieldConfig;
  value: string;
  onChange: (key: keyof TypographyFormValues, value: string) => void;
}) {
  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">{config.label}</label>
      <select
        value={value}
        onChange={(event) => onChange(config.key, event.target.value)}
        className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1"
      >
        {config.options?.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}

function TypographyFormActions({ onCancel }: { onCancel: () => void }) {
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
