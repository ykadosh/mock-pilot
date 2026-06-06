// eslint-disable-next-line @typescript-eslint/no-require-imports
const { html_beautify } = require("js-beautify");

export function handleFormatHtml(_event: Electron.IpcMainInvokeEvent, rawHtml: string) {
  try {
    const formattedHtml = html_beautify(rawHtml, {
      indent_size: 2,
      indent_char: " ",
      max_preserve_newlines: 1,
      preserve_newlines: true,
      wrap_line_length: 0,
      end_with_newline: true,
      indent_inner_html: true,
      css_indent_size: 2,
      content_unformatted: ["pre", "code", "textarea", "style"],
    });
    return { success: true, html: `<!DOCTYPE html>\n${formattedHtml}` };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
