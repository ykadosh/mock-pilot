import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { SelectedElement } from "../pages/Editor";
import { getModificationError, requestElementModification } from "./PropertiesPanel.utils";

interface UsePropertiesPanelModifierArgs {
  element: SelectedElement;
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  getElementHTML?: () => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
}

export function usePropertiesPanelModifier({ element, onApplyModification, getElementHTML }: UsePropertiesPanelModifierArgs) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [element]);

  const handleApply = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setLoading(true);
    setError("");
    try {
      const result = await requestElementModification(element, trimmedPrompt, getElementHTML);
      if ("error" in result) return setError(result.error);
      onApplyModification?.(element.mpId, result.html, trimmedPrompt);
      setPrompt("");
    } catch (applyError: unknown) {
      setError(getModificationError(applyError));
    } finally {
      setLoading(false);
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || !prompt.trim() || loading) return;
    event.preventDefault();
    void handleApply();
  };

  return { error, handleApply, handlePromptKeyDown, loading, prompt, setPrompt, textareaRef };
}
