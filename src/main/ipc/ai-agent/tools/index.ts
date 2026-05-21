import type { ToolDefinition, ToolSchema } from "../agent-types";
import { searchHtml } from "./search-html";
import { searchCss } from "./search-css";
import { getElementInfo } from "./get-element-info";
import { editHtml } from "./edit-html";
import { editCss } from "./edit-css";
import { addElement } from "./add-element";
import { removeElement } from "./remove-element";
import { takeScreenshot } from "./take-screenshot";
import { listFonts } from "./list-fonts";
import { listComponents } from "./list-components";
import { listIcons } from "./list-icons";
import { getDesignTokens } from "./get-design-tokens";

const allTools: ToolDefinition[] = [
  searchHtml,
  searchCss,
  getElementInfo,
  editHtml,
  editCss,
  addElement,
  removeElement,
  takeScreenshot,
  listFonts,
  listComponents,
  listIcons,
  getDesignTokens,
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
