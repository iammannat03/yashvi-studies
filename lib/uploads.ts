import path from "path";
import { toStoredHtmlFileName } from "@/lib/file-names";
import {
  createDirectory,
  deleteStoredFile,
  ensureStorageReady,
  getAllDirectories,
  getEntryType,
  getStoredFileContent,
  getStoredFileUrl,
  listDirectory,
  moveEntry,
  saveStoredFile,
  storedFileExists,
} from "@/lib/storage";
import {
  joinPath,
  normalizeRelativePath,
  parentPath,
} from "@/lib/storage/paths";
import type { FileItem } from "@/lib/storage/types";

export type { FileItem };
export { getStoredFileUrl as getFilePublicUrl, getStoredFileContent as getFileContent, ensureStorageReady as ensureUploadsRoot };
export { normalizeRelativePath, joinPath } from "@/lib/storage/paths";
export { UPLOADS_ROOT } from "@/lib/storage/paths";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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

export {
  createDirectory,
  getAllDirectories,
  listDirectory,
  moveEntry,
};

export async function deleteFile(relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  if (!isHtmlFile(normalized)) {
    throw new Error("Only HTML files can be deleted");
  }
  await deleteStoredFile(normalized);
}

export async function renameEntry(
  relativePath: string,
  newName: string,
): Promise<string> {
  const normalized = normalizeRelativePath(relativePath);
  const entryType = await getEntryType(normalized);
  const safeNewName =
    entryType === "file"
      ? toStoredHtmlFileName(newName)
      : path.basename(newName.trim());

  if (!safeNewName) {
    throw new Error("Name is required");
  }

  if (entryType === "file") {
    if (!isValidHtmlFileName(safeNewName)) {
      throw new Error("Invalid file name");
    }
  } else if (!isValidFolderName(safeNewName)) {
    throw new Error("Folder name cannot contain / or \\");
  }

  const parent = parentPath(normalized);
  const toRelative = joinPath(parent, safeNewName);

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

  let relativeTarget = joinPath(subPath, safeName);

  if (await storedFileExists(relativeTarget)) {
    const parsed = path.parse(safeName);
    relativeTarget = joinPath(subPath, `${parsed.name}-${Date.now()}${parsed.ext}`);
  }

  await saveStoredFile(buffer, relativeTarget);
  return normalizeRelativePath(relativeTarget);
}

export function validateHtmlViewPath(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!isHtmlFile(normalized)) {
    throw new Error("Not an HTML file");
  }
  return normalized;
}

export async function assertHtmlFileExists(relativePath: string): Promise<string> {
  const validatedPath = validateHtmlViewPath(relativePath);
  if (!(await storedFileExists(validatedPath))) {
    throw new Error("File not found");
  }
  return validatedPath;
}

// Kept for any code that still imports resolveUploadPath in local-only contexts.
export { resolveUploadPath } from "@/lib/storage/local-store";
