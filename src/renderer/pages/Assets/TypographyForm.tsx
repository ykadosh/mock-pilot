import { useMemo, useState, useImperativeHandle, forwardRef } from "react";

import { type AvailableFonts, getWeightLabel } from "./fontFaceParser";

type TypographyFormValues = Omit<TypographyAsset, "id">;

interface TypographyFormProps {
  initial?: TypographyFormValues;
  availableFonts: AvailableFonts;
  onSave: (values: TypographyFormValues) => void;
}

export interface TypographyFormRef {
  submit: () => void;
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

export const TypographyForm = forwardRef<TypographyFormRef, TypographyFormProps>(function TypographyForm(
  { initial, availableFonts, onSave },
  ref
) {
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

  useImperativeHandle(ref, () => ({
    submit: () => onSave(values),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextFormField label="Label" value={values.label} onChange={(v) => handleChange("label", v)} />
        <SelectFormField label="Font Family" value={values.fontFamily} options={fontFamilyOptions} onChange={(v) => handleChange("fontFamily", v)} />
        <TextFormField label="Font Size" value={values.fontSize} onChange={(v) => handleChange("fontSize", v)} />
        <SelectFormField label="Font Weight" value={values.fontWeight} options={weightOptions} formatOption={getWeightLabel} onChange={(v) => handleChange("fontWeight", v)} />
        <SelectFormField label="Font Style" value={values.fontStyle} options={["normal", "italic"]} onChange={(v) => handleChange("fontStyle", v)} />
        <TextFormField label="Line Height" value={values.lineHeight} onChange={(v) => handleChange("lineHeight", v)} />
        <TextFormField label="Letter Spacing" value={values.letterSpacing} onChange={(v) => handleChange("letterSpacing", v)} />
        <SelectFormField label="Text Transform" value={values.textTransform} options={["none", "uppercase", "lowercase", "capitalize"]} onChange={(v) => handleChange("textTransform", v)} />
      </div>
      <TypographyFormPreview values={values} />
    </div>
  );
});

function getInitialValues(initial: TypographyFormValues | undefined, availableFonts: AvailableFonts): TypographyFormValues {
  const merged = { ...DEFAULT_VALUES, ...initial };
  if (!merged.fontFamily && availableFonts.textFonts.size > 0) {
    merged.fontFamily = [...availableFonts.textFonts.keys()][0];
  }
  return merged;
}

function TypographyFormPreview({ values }: { values: TypographyFormValues }) {
  const previewStyle = {
    fontFamily: values.fontFamily,
    fontSize: values.fontSize,
    fontWeight: values.fontWeight,
    fontStyle: values.fontStyle,
    lineHeight: values.lineHeight,
    letterSpacing: values.letterSpacing,
    textTransform: values.textTransform as React.CSSProperties["textTransform"],
  };

  return (
    <div className="border-outline/20 bg-surface-variant/30 rounded-lg border p-4">
      <p className="text-ui-small text-outline mb-2">Preview</p>
      <p className="text-on-surface" style={previewStyle}>
        The quick brown fox jumps over the lazy dog
      </p>
    </div>
  );
}

function TextFormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="font-ui-small text-ui-small text-on-surface-variant mb-1.5 block font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline-variant bg-surface text-on-surface text-ui-small focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none"
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
      <label className="font-ui-small text-ui-small text-on-surface-variant mb-1.5 block font-medium">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-outline-variant bg-surface text-on-surface text-ui-small focus:border-primary w-full rounded-lg border px-3 py-2 transition-colors focus:outline-none"
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

