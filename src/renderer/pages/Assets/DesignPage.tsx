import { useRef } from "react";
import { useParams } from "react-router-dom";

import { useDesignDoc } from "./DesignPage.hooks";
import { DesignPageHeader } from "./DesignPageHeader";

const PLACEHOLDER = `# Design Spec

Describe your project's design language here. The contents of this file are injected into the AI editor's system prompt so every change stays faithful to the captured project's theme.

Suggested sections:
- Overview (tone, voice)
- Color palette (hex values + usage)
- Typography (families, scale, weights)
- Spacing & layout
- Component patterns
- Iconography & imagery
- Do's & don'ts
`;

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export function DesignPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { content, setContent, status, stage, error, save, generate, dirty, hasSaved, enabled, setEnabled } = useDesignDoc(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setContent(await readFileAsText(file));
  };

  const busy = status === "loading" || status === "saving" || status === "generating";

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      <DesignPageHeader
        status={status} stage={stage} hasSaved={hasSaved} dirty={dirty} busy={busy}
        enabled={enabled} onToggleEnabled={(v) => void setEnabled(v)}
        onUpload={() => fileInputRef.current?.click()}
        onGenerate={() => void generate()}
        onSave={() => void save()}
      />
      {error && <p className="text-error mb-2 text-xs">{error}</p>}
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={PLACEHOLDER}
        disabled={status === "loading" || status === "generating"}
        spellCheck={false}
        className="border-outline/20 bg-surface-container text-on-surface min-h-0 flex-1 resize-none rounded-lg border p-4 font-mono text-xs leading-relaxed outline-none focus:border-violet-400 disabled:opacity-50"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
    </div>
  );
}
