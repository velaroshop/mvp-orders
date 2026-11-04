// JavaScript errors that do not come from our pages and say nothing about them: they are not counted as page errors.
// - "Script error.": the browser hides the details of an error thrown by a script from another domain (in-app browsers, extensions)
// - iabjs://...: code that the Facebook / Instagram in-app browser injects into every page it opens

/** message: the error message, or the stored text "<message> @ <file>:<line>"; filename: the script that failed, when known */
export function isNoiseError(message: string | null | undefined, filename?: string | null): boolean {
  const text = message ?? "";
  return text.trim() === "Script error." || text.includes("iabjs://") || (filename ?? "").startsWith("iabjs://");
}
