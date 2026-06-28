import path from "path";

function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

export function isHtmlFile(name: string): boolean {
  return name.toLowerCase().endsWith(".html");
}

export function stripHtmlExtension(fileName: string): string {
  const base = path.basename(fileName);
  if (base.toLowerCase().endsWith(".html")) {
    return base.slice(0, -5);
  }
  return base;
}

export function toStoredHtmlFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  const base = path.basename(trimmed);
  if (base.toLowerCase().endsWith(".html")) {
    return base;
  }

  return `${base}.html`;
}

export function formatPathForDisplay(relativePath: string): string {
  const parts = normalizeRelativePath(relativePath).split("/");
  if (parts.length === 0) return relativePath;

  const last = parts[parts.length - 1];
  if (isHtmlFile(last)) {
    parts[parts.length - 1] = stripHtmlExtension(last);
  }

  return parts.join("/");
}

export function buildViewUrl(relativePath: string): string {
  return `/view?path=${encodeURIComponent(relativePath)}`;
}
