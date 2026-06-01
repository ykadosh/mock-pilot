import type { ToolDefinition, ToolSchema } from "../agent-types";
import { searchHtml } from "./search-html";
import { searchCss } from "./search-css";
import { getElementInfo } from "./get-element-info";
import { batchSearchCss, batchSearchHtml, batchGetElementInfo } from "./batch-search";
import { editHtml } from "./edit-html";
import { editInnerHtml } from "./edit-inner-html";
import { editCss } from "./edit-css";
import { editText } from "./edit-text";
import { editAttribute } from "./edit-attribute";
import { addElement } from "./add-element";
import { removeElement } from "./remove-element";
import { undo } from "./undo";
import { takeScreenshot } from "./take-screenshot";
import { listFonts } from "./list-fonts";
import { listComponents } from "./list-components";
import { listIcons } from "./list-icons";
import { getDesignTokens } from "./get-design-tokens";
import { finish } from "./finish";
import { planChanges, reinspect } from "./phase-control";
import { viewImage } from "./view-image";
import { saveAttachmentToAssets } from "./save-attachment-to-assets";

const allTools: ToolDefinition[] = [
  planChanges,
  reinspect,
  searchHtml,
  searchCss,
  getElementInfo,
  batchSearchHtml,
  batchSearchCss,
  batchGetElementInfo,
  editHtml,
  editInnerHtml,
  editCss,
  editText,
  editAttribute,
  addElement,
  removeElement,
  undo,
  takeScreenshot,
  listFonts,
  listComponents,
  listIcons,
  getDesignTokens,
  viewImage,
  saveAttachmentToAssets,
  finish,
];

const toolMap = new Map<string, ToolDefinition>(
  allTools.map((tool) => [tool.schema.function.name, tool]),
);

export function getToolSchemas(): ToolSchema[] {
  return allTools.map((tool) => tool.schema);
}

export function getToolExecutor(name: string): ToolDefinition["execute"] | null {
  return toolMap.get(name)?.execute ?? null;
}

export function getToolNames(): string[] {
  return allTools.map((tool) => tool.schema.function.name);
}
