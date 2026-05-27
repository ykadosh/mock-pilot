import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectedElement } from "../pages/Editor";
import type { Attachment, ImageAttachment } from "./PromptBox.types";
import type { AgentMessage } from "../hooks/useConversation";
import { usePromptSubmit } from "./PromptBox.submit";
import { buildElementSelector } from "./PropertiesPanel.utils";

interface UsePromptBoxArgs {
  onApplyModification?: (mpId: string, newHTML: string, label?: string) => void;
  onApplyPageModification?: (newHTML: string, label?: string) => void;
  getElementHTML?: (mpId: string) => Promise<{ outerHTML: string; computedStyle: Record<string, string> } | null>;
  getFullPageHTML?: () => string | null;
  projectAssets?: object;
  onConversationMessage?: (role: "user" | "assistant", content: string, type?: "message" | "thinking" | "tool" | "done") => void;
  openChat?: () => void;
  getPreviousAgentMessages?: () => AgentMessage[];
  onAgentMessagesUpdate?: (messages: AgentMessage[]) => void;
  readOnly?: boolean;
  projectId?: string;
  getActiveSessionId?: () => string | null;
}

function useImageAttachment(setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImageAttachment = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: ImageAttachment = {
        type: "image",
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        dataUrl: reader.result as string,
      };
      setAttachments((prev) => [...prev, attachment]);
    };
    reader.readAsDataURL(file);
  }, [setAttachments]);

  const handleFileSelect = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith("image/")) addImageAttachment(file);
    }
    event.target.value = "";
  }, [addImageAttachment]);

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      event.preventDefault();
      const file = item.getAsFile();
      if (file) addImageAttachment(file);
    }
  }, [addImageAttachment]);

  return { addImageAttachment, fileInputRef, handleFileChange, handleFileSelect, handlePaste };
}

function useKeyboardShortcut(textareaRef: React.RefObject<HTMLTextAreaElement | null>) {
  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef]);
}

export function usePromptBox(args: UsePromptBoxArgs) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageUtils = useImageAttachment(setAttachments);
  const submit = usePromptSubmit({ ...args, attachments, setAttachments });

  useKeyboardShortcut(textareaRef);

  const addElementAttachment = useCallback((element: SelectedElement) => {
    setAttachments((prev) => {
      if (prev.some((a) => a.type === "element" && a.element.mpId === element.mpId)) return prev;
      return [...prev, { type: "element", element }];
    });
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    addElementAttachment,
    attachments,
    ...submit,
    fileInputRef: imageUtils.fileInputRef,
    handleFileChange: imageUtils.handleFileChange,
    handleFileSelect: imageUtils.handleFileSelect,
    handlePaste: imageUtils.handlePaste,
    removeAttachment,
    textareaRef,
  };
}

export function getAttachmentLabel(attachment: Attachment): string {
  if (attachment.type === "element") return buildElementSelector(attachment.element);
  return attachment.name;
}
