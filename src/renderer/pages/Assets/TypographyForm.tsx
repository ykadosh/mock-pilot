import { useMemo, useState, type FormEvent } from "react";

import { type AvailableFonts, getWeightLabel } from "./fontFaceParser";

type TypographyFormValues = Omit<TypographyAsset, "id">;

interface TypographyFormProps {
  initial?: TypographyFormValues;
  availableFonts: AvailableFonts;
  onSave: (values: TypographyFormValues) => void;
  onCancel: () => void;
}

const DEFAULT_VALUES: TypographyFormValues = {
  label: "",
  fontFamily: "",
  fontSize: "16px",
  fontWeight: "400",
  fontStyle: "normal",
  lineHeight: "normal",
  letterSpacing: "normal",
  textTransform: "none",
};

export function TypographyForm({ initial, availableFonts, onSave, onCancel }: TypographyFormProps) {
  const [values, setValues] = useState<TypographyFormValues>(() => getInitialValues(initial, availableFonts));

  const fontFamilyOptions = useMemo(() => [...availableFonts.textFonts.keys()], [availableFonts]);

  const weightOptions = useMemo(() => {
    return availableFonts.textFonts.get(values.fontFamily) || ["400"];
  }, [availableFonts, values.fontFamily]);

  const handleChange = (key: keyof TypographyFormValues, value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "fontFamily") {
        const weights = availableFonts.textFonts.get(value);
        if (weights && !weights.includes(current.fontWeight)) {
          next.fontWeight = weights[0] || "400";
        }
      }
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(values);
  };

  return (
    <form onSubmit={handleSubmit} className="border-outline/20 bg-surface mb-3 space-y-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <TextFormField label="Label" value={values.label} onChange={(v) => handleChange("label", v)} />
        <SelectFormField label="Font Family" value={values.fontFamily} options={fontFamilyOptions} onChange={(v) => handleChange("fontFamily", v)} />
        <TextFormField label="Font Size" value={values.fontSize} onChange={(v) => handleChange("fontSize", v)} />
        <SelectFormField label="Font Weight" value={values.fontWeight} options={weightOptions} formatOption={getWeightLabel} onChange={(v) => handleChange("fontWeight", v)} />
        <SelectFormField label="Font Style" value={values.fontStyle} options={["normal", "italic"]} onChange={(v) => handleChange("fontStyle", v)} />
        <TextFormField label="Line Height" value={values.lineHeight} onChange={(v) => handleChange("lineHeight", v)} />
        <TextFormField label="Letter Spacing" value={values.letterSpacing} onChange={(v) => handleChange("letterSpacing", v)} />
        <SelectFormField label="Text Transform" value={values.textTransform} options={["none", "uppercase", "lowercase", "capitalize"]} onChange={(v) => handleChange("textTransform", v)} />
      </div>
      <TypographyFormActions onCancel={onCancel} />
    </form>
  );
}

function getInitialValues(initial: TypographyFormValues | undefined, availableFonts: AvailableFonts): TypographyFormValues {
  const merged = { ...DEFAULT_VALUES, ...initial };
  if (!merged.fontFamily && availableFonts.textFonts.size > 0) {
    merged.fontFamily = [...availableFonts.textFonts.keys()][0];
  }
  return merged;
}

function TextFormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1"
      />
    </div>
  );
}

function SelectFormField({
  label,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  formatOption?: (option: string) => string;
  onChange: (v: string) => void;
}) {
  // Include current value in options if not present (backwards compat)
  const allOptions = options.includes(value) ? options : [value, ...options];

  return (
    <div>
      <label className="text-ui-small text-outline mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline/30 bg-background text-on-surface text-ui-small w-full rounded border px-2 py-1"
      >
        {allOptions.map((option) => (
          <option key={option} value={option}>
            {formatOption ? formatOption(option) : option}
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
