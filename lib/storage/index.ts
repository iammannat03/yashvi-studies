import {
  blobCreateDirectory,
  blobDeleteFile,
  blobFileExists,
  blobGetAllDirectories,
  blobGetEntryType,
  blobGetFileUrl,
  blobListDirectory,
  blobMoveEntry,
  blobSaveFile,
} from "@/lib/storage/blob-store";
import {
  localCreateDirectory,
  localDeleteFile,
  localEnsureRoot,
  localFileExists,
  localGetAllDirectories,
  localGetEntryType,
  localListDirectory,
  localMoveEntry,
  localSaveFile,
} from "@/lib/storage/local-store";
import { localPublicUrl } from "@/lib/storage/paths";
import type { FileItem } from "@/lib/storage/types";

export function useBlobStorage(): boolean {
  // Vercel deployments cannot write to the local filesystem.
  if (process.env.VERCEL === "1") return true;

  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID,
  );
}

export async function ensureStorageReady(): Promise<void> {
  if (useBlobStorage()) return;
  await localEnsureRoot();
}

export async function listDirectory(relativePath = ""): Promise<{
  path: string;
  items: FileItem[];
}> {
  if (useBlobStorage()) return blobListDirectory(relativePath);
  return localListDirectory(relativePath);
}

export async function createDirectory(
  parentPath: string,
  name: string,
): Promise<void> {
  if (useBlobStorage()) return blobCreateDirectory(parentPath, name);
  return localCreateDirectory(parentPath, name);
}

export async function moveEntry(from: string, to: string): Promise<void> {
  if (useBlobStorage()) return blobMoveEntry(from, to);
  return localMoveEntry(from, to);
}

export async function deleteStoredFile(relativePath: string): Promise<void> {
  if (useBlobStorage()) return blobDeleteFile(relativePath);
  return localDeleteFile(relativePath);
}

export async function saveStoredFile(
  buffer: Buffer,
  relativePath: string,
): Promise<void> {
  if (useBlobStorage()) return blobSaveFile(buffer, relativePath);
  return localSaveFile(buffer, relativePath);
}

export async function storedFileExists(relativePath: string): Promise<boolean> {
  if (useBlobStorage()) return blobFileExists(relativePath);
  return localFileExists(relativePath);
}

export async function getStoredFileUrl(relativePath: string): Promise<string> {
  if (useBlobStorage()) return blobGetFileUrl(relativePath);
  return localPublicUrl(relativePath);
}

export async function getEntryType(
  relativePath: string,
): Promise<"file" | "directory"> {
  if (useBlobStorage()) return blobGetEntryType(relativePath);
  return localGetEntryType(relativePath);
}

export async function getAllDirectories(relativePath = ""): Promise<string[]> {
  if (useBlobStorage()) return blobGetAllDirectories(relativePath);
  return localGetAllDirectories(relativePath);
}
