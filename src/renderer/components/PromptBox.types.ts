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

export type Attachment = ElementAttachment | ImageAttachment;
