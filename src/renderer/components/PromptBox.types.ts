import type { SelectedElement } from "../pages/Editor";

export interface ElementAttachment {
  type: "element";
  element: SelectedElement;
}

export interface ImageAttachment {
  type: "image";
  id: string;
  name: string;
  dataUrl: string;
}

export interface ComponentAttachment {
  type: "component";
  id: string;
  label: string;
  html: string;
  description?: string;
  props?: { name: string; type: string; description: string }[];
}

export interface TypographyAttachment {
  type: "typography";
  id: string;
  label: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
}

export interface IconAttachment {
  type: "icon";
  name: string;
  codepoint: string;
  fontFamily: string;
  renderMode: "codepoint" | "ligature";
}

export interface GraphicAttachment {
  type: "graphic";
  filename: string;
  extension: string;
  sizeBytes: number;
  projectId: string;
}

export interface ColorAttachment {
  type: "color";
  id: string;
  label: string;
  value: string;
}

export type Attachment =
  | ElementAttachment
  | ImageAttachment
  | ComponentAttachment
  | TypographyAttachment
  | IconAttachment
  | GraphicAttachment
  | ColorAttachment;

export function getAssetAttachmentKey(attachment: Attachment): string {
  switch (attachment.type) {
    case "element": return `element:${attachment.element.mpId}`;
    case "image": return `image:${attachment.id}`;
    case "component": return `component:${attachment.id}`;
    case "typography": return `typography:${attachment.id}`;
    case "icon": return `icon:${attachment.fontFamily}:${attachment.codepoint}`;
    case "graphic": return `graphic:${attachment.filename}`;
    case "color": return `color:${attachment.id}`;
  }
}
