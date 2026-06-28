import fs from "fs/promises";
import path from "path";
import { toStoredHtmlFileName } from "@/lib/file-names";

export const UPLOADS_ROOT = path.join(process.cwd(), "public/uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type FileItem = {
  name: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: string;
};

function normalizeRelativePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

export function resolveUploadPath(relativePath = ""): string {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(UPLOADS_ROOT, normalized);

  if (
    resolved !== UPLOADS_ROOT &&
    !resolved.startsWith(UPLOADS_ROOT + path.sep)
  ) {
    throw new Error("Invalid path");
  }

  return resolved;
}

export function isHtmlFile(name: string): boolean {
  return name.toLowerCase().endsWith(".html");
}

function isValidEntryName(name: string): boolean {
  if (!name || name.includes("..")) return false;
  if (/[/\\]/.test(name)) return false;
  if (/[\0<>:"|?*]/.test(name)) return false;
  return name.trim().length > 0;
}

export function isValidFolderName(name: string): boolean {
  return isValidEntryName(name);
}

export function isValidHtmlFileName(name: string): boolean {
  const base = path.basename(name);
  return isHtmlFile(base) && isValidEntryName(base);
}

export async function ensureUploadsRoot(): Promise<void> {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

export async function listDirectory(relativePath = ""): Promise<{
  path: string;
  items: FileItem[];
}> {
  const dirPath = resolveUploadPath(relativePath);
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const items: FileItem[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === ".gitkeep") continue;

    const entryPath = path.join(dirPath, entry.name);
    const stat = await fs.stat(entryPath);

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        type: "directory",
        updatedAt: stat.mtime.toISOString(),
      });
    } else if (entry.isFile() && isHtmlFile(entry.name)) {
      items.push({
        name: entry.name,
        type: "file",
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { path: normalizeRelativePath(relativePath), items };
}

export async function createDirectory(
  parentPath: string,
  name: string,
): Promise<void> {
  if (!isValidFolderName(name)) {
    throw new Error("Invalid folder name");
  }

  const dirPath = resolveUploadPath(
    parentPath ? `${parentPath}/${name}` : name,
  );
  await fs.mkdir(dirPath, { recursive: false });
}

export async function moveEntry(from: string, to: string): Promise<void> {
  const fromPath = resolveUploadPath(from);
  const toPath = resolveUploadPath(to);

  await fs.access(fromPath);
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.rename(fromPath, toPath);
}

export async function deleteFile(relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  if (!isHtmlFile(normalized)) {
    throw new Error("Only HTML files can be deleted");
  }

  const filePath = resolveUploadPath(normalized);
  const stat = await fs.stat(filePath);

  if (!stat.isFile()) {
    throw new Error("Not a file");
  }

  await fs.unlink(filePath);
}

export async function renameEntry(
  relativePath: string,
  newName: string,
): Promise<string> {
  const normalized = normalizeRelativePath(relativePath);
  const fromPath = resolveUploadPath(normalized);
  const stat = await fs.stat(fromPath);
  const safeNewName = stat.isFile()
    ? toStoredHtmlFileName(newName)
    : path.basename(newName.trim());

  if (!safeNewName) {
    throw new Error("Name is required");
  }

  if (stat.isFile()) {
    if (!isValidHtmlFileName(safeNewName)) {
      throw new Error("Invalid file name");
    }
  } else if (stat.isDirectory()) {
    if (!isValidFolderName(safeNewName)) {
      throw new Error("Folder name cannot contain / or \\");
    }
  } else {
    throw new Error("Unsupported entry type");
  }

  const parentRelative = normalized.includes("/")
    ? normalized.slice(0, normalized.lastIndexOf("/"))
    : "";
  const toRelative = parentRelative
    ? `${parentRelative}/${safeNewName}`
    : safeNewName;

  if (toRelative === normalized) {
    return normalized;
  }

  await moveEntry(normalized, toRelative);
  return toRelative;
}

export async function saveUploadedFile(
  buffer: Buffer,
  fileName: string,
  subPath = "",
): Promise<string> {
  if (!isHtmlFile(fileName)) {
    throw new Error("Only .html files are allowed");
  }

  const safeName = path.basename(fileName);
  if (!isValidHtmlFileName(safeName)) {
    throw new Error("Invalid file name");
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("File too large");
  }

  let targetDir = resolveUploadPath(subPath);
  await fs.mkdir(targetDir, { recursive: true });

  let targetPath = path.join(targetDir, safeName);
  let relativeTarget = subPath
    ? `${normalizeRelativePath(subPath)}/${safeName}`
    : safeName;

  try {
    await fs.access(targetPath);
    const parsed = path.parse(safeName);
    const stamped = `${parsed.name}-${Date.now()}${parsed.ext}`;
    targetPath = path.join(targetDir, stamped);
    relativeTarget = subPath
      ? `${normalizeRelativePath(subPath)}/${stamped}`
      : stamped;
  } catch {
    // file does not exist — use original name
  }

  await fs.writeFile(targetPath, buffer);
  return normalizeRelativePath(relativeTarget);
}

export async function getAllDirectories(
  relativePath = "",
): Promise<string[]> {
  const { items } = await listDirectory(relativePath);
  const dirs: string[] = [];

  if (relativePath) {
    dirs.push(relativePath);
  }

  for (const item of items) {
    if (item.type === "directory") {
      const childPath = relativePath ? `${relativePath}/${item.name}` : item.name;
      dirs.push(...(await getAllDirectories(childPath)));
    }
  }

  return dirs.sort();
}

export function validateHtmlViewPath(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!isHtmlFile(normalized)) {
    throw new Error("Not an HTML file");
  }
  return normalized;
}
