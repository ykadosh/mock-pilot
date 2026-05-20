/* eslint-disable check-file/folder-naming-convention */
export type { IconLibraryMeta } from "./font-awesome";
export { fontAwesomeLibrary } from "./font-awesome";
export { materialIconsLibrary } from "./material-icons";
export { bootstrapIconsLibrary } from "./bootstrap-icons";
export { remixIconsLibrary } from "./remix-icons";

import type { IconLibraryMeta } from "./font-awesome";
import { fontAwesomeLibrary } from "./font-awesome";
import { materialIconsLibrary } from "./material-icons";
import { bootstrapIconsLibrary } from "./bootstrap-icons";
import { remixIconsLibrary } from "./remix-icons";

export const ALL_ICON_LIBRARIES: IconLibraryMeta[] = [
  fontAwesomeLibrary,
  materialIconsLibrary,
  bootstrapIconsLibrary,
  remixIconsLibrary,
];

export function getLibraryById(id: string): IconLibraryMeta | undefined {
  return ALL_ICON_LIBRARIES.find((lib) => lib.id === id);
}
