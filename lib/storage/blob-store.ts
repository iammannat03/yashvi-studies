import { copy, createFolder, del, get, head, list, put } from "@vercel/blob";
import {
  blobPathToRelative,
  isHiddenBlobName,
  joinPath,
  listPrefix,
  normalizeRelativePath,
  toBlobPath,
} from "@/lib/storage/paths";
import type { FileItem } from "@/lib/storage/types";

const BLOB_ACCESS = "private" as const;

async function blobExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(relativePath: string): Promise<boolean> {
  const pathname = toBlobPath(relativePath);
  if (await blobExists(pathname)) return false;

  const prefix = `${pathname}/`;
  const { blobs, folders } = await list({ prefix, mode: "folded" });
  return (
    blobs.some(
      (blob) => !isHiddenBlobName(blobPathToRelative(blob.pathname)),
    ) ||
    folders.length > 0 ||
    (await blobExists(`${pathname}/.keep`))
  );
}

export async function blobListDirectory(relativePath = ""): Promise<{
  path: string;
  items: FileItem[];
}> {
  const prefix = listPrefix(relativePath);
  const { blobs, folders } = await list({ prefix, mode: "folded" });
  const items: FileItem[] = [];

  for (const folder of folders) {
    const name = folder.replace(prefix, "").replace(/\/$/, "");
    if (!name || isHiddenBlobName(name)) continue;
    items.push({ name, type: "directory" });
  }

  for (const blob of blobs) {
    const name = blob.pathname.replace(prefix, "");
    if (!name || isHiddenBlobName(name)) continue;
    items.push({
      name,
      type: "file",
      size: blob.size,
      updatedAt: blob.uploadedAt.toISOString(),
    });
  }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { path: normalizeRelativePath(relativePath), items };
}

export async function blobCreateDirectory(
  parentPath: string,
  name: string,
): Promise<void> {
  const folderPath = joinPath(parentPath, name);
  await createFolder(`${toBlobPath(folderPath)}/`, { access: BLOB_ACCESS });
}

export async function blobSaveFile(
  buffer: Buffer,
  relativePath: string,
): Promise<void> {
  await put(toBlobPath(relativePath), buffer, {
    access: BLOB_ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/html",
  });
}

export async function blobDeleteFile(relativePath: string): Promise<void> {
  await del(toBlobPath(relativePath));
}

export async function blobDeleteDirectory(relativePath: string): Promise<void> {
  const normalized = normalizeRelativePath(relativePath);
  const prefix = `${toBlobPath(normalized)}/`;
  const { blobs } = await list({ prefix, mode: "expanded" });
  const pathnames = blobs.map((blob) => blob.pathname);

  if (!pathnames.includes(prefix)) {
    pathnames.push(prefix);
  }

  if (pathnames.length === 0) {
    throw new Error("Folder not found");
  }

  await del(pathnames);
}

export async function blobGetFileUrl(relativePath: string): Promise<string> {
  return `/api/files/content?path=${encodeURIComponent(relativePath)}`;
}

export async function blobGetFileContent(
  relativePath: string,
): Promise<Buffer> {
  const result = await get(toBlobPath(relativePath), { access: BLOB_ACCESS });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("File not found");
  }

  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function blobFileExists(relativePath: string): Promise<boolean> {
  return blobExists(toBlobPath(relativePath));
}

async function blobCopyPath(fromRelative: string, toRelative: string) {
  const fromPathname = toBlobPath(fromRelative);
  const toPathname = toBlobPath(toRelative);
  const source = await head(fromPathname);
  await copy(source.url, toPathname, {
    access: BLOB_ACCESS,
    addRandomSuffix: false,
  });
  await del(fromPathname);
}

async function blobMoveDirectory(fromRelative: string, toRelative: string) {
  const fromPrefix = `${toBlobPath(fromRelative)}/`;
  const toPrefix = `${toBlobPath(toRelative)}/`;
  const { blobs } = await list({ prefix: fromPrefix, mode: "expanded" });

  for (const blob of blobs) {
    const suffix = blob.pathname.slice(fromPrefix.length);
    const newPathname = `${toPrefix}${suffix}`;
    await copy(blob.url, newPathname, {
      access: BLOB_ACCESS,
      addRandomSuffix: false,
    });
    await del(blob.pathname);
  }
}

export async function blobMoveEntry(
  fromRelative: string,
  toRelative: string,
): Promise<void> {
  const fromNormalized = normalizeRelativePath(fromRelative);
  const toNormalized = normalizeRelativePath(toRelative);

  if (await blobFileExists(fromNormalized)) {
    await blobCopyPath(fromNormalized, toNormalized);
    return;
  }

  if (await isDirectory(fromNormalized)) {
    await blobMoveDirectory(fromNormalized, toNormalized);
    return;
  }

  throw new Error("Item not found");
}

export async function blobGetAllDirectories(
  relativePath = "",
): Promise<string[]> {
  const { items } = await blobListDirectory(relativePath);
  const dirs: string[] = [];

  if (relativePath) {
    dirs.push(relativePath);
  }

  for (const item of items) {
    if (item.type === "directory") {
      const childPath = joinPath(relativePath, item.name);
      dirs.push(...(await blobGetAllDirectories(childPath)));
    }
  }

  return dirs.sort();
}

export async function blobGetEntryType(
  relativePath: string,
): Promise<"file" | "directory"> {
  if (await blobFileExists(relativePath)) return "file";
  if (await isDirectory(relativePath)) return "directory";
  throw new Error("Item not found");
}
