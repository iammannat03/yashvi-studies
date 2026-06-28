import path from "path";

export function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

export function toBlobPath(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  return normalized ? `uploads/${normalized}` : "uploads";
}

export function listPrefix(relativePath = ""): string {
  const normalized = normalizeRelativePath(relativePath);
  return normalized ? `${toBlobPath(normalized)}/` : "uploads/";
}

export function parentPath(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized.includes("/")) return "";
  return normalized.slice(0, normalized.lastIndexOf("/"));
}

export function entryName(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  return normalized.split("/").pop() ?? normalized;
}

export function joinPath(parent: string, name: string): string {
  const normalizedParent = normalizeRelativePath(parent);
  return normalizedParent ? `${normalizedParent}/${name}` : name;
}

export function blobPathToRelative(pathname: string): string {
  return pathname.replace(/^uploads\/?/, "");
}

export function isHiddenBlobName(name: string): boolean {
  return name === ".keep" || name.startsWith(".");
}

export function localPublicUrl(relativePath: string): string {
  return `/uploads/${normalizeRelativePath(relativePath)
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const UPLOADS_ROOT = path.join(process.cwd(), "public/uploads");
