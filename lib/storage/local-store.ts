import fs from "fs/promises";
import path from "path";
import {
  joinPath,
  normalizeRelativePath,
  UPLOADS_ROOT,
} from "@/lib/storage/paths";
import type { FileItem } from "@/lib/storage/types";
import { isHtmlFile } from "@/lib/file-names";

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

export async function localEnsureRoot(): Promise<void> {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

export async function localListDirectory(relativePath = ""): Promise<{
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

export async function localCreateDirectory(
  parentPath: string,
  name: string,
): Promise<void> {
  const dirPath = resolveUploadPath(joinPath(parentPath, name));
  await fs.mkdir(dirPath, { recursive: false });
}

export async function localMoveEntry(from: string, to: string): Promise<void> {
  const fromPath = resolveUploadPath(from);
  const toPath = resolveUploadPath(to);

  await fs.access(fromPath);
  await fs.mkdir(path.dirname(toPath), { recursive: true });
  await fs.rename(fromPath, toPath);
}

export async function localDeleteFile(relativePath: string): Promise<void> {
  const filePath = resolveUploadPath(relativePath);
  const stat = await fs.stat(filePath);

  if (!stat.isFile()) {
    throw new Error("Not a file");
  }

  await fs.unlink(filePath);
}

export async function localDeleteDirectory(relativePath: string): Promise<void> {
  const dirPath = resolveUploadPath(relativePath);
  const stat = await fs.stat(dirPath);

  if (!stat.isDirectory()) {
    throw new Error("Not a folder");
  }

  await fs.rm(dirPath, { recursive: true, force: true });
}

export async function localSaveFile(
  buffer: Buffer,
  relativePath: string,
): Promise<void> {
  const targetPath = resolveUploadPath(relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, buffer);
}

export async function localFileExists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(resolveUploadPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function localGetFileContent(relativePath: string): Promise<Buffer> {
  return fs.readFile(resolveUploadPath(relativePath));
}

export async function localGetEntryType(
  relativePath: string,
): Promise<"file" | "directory"> {
  const stat = await fs.stat(resolveUploadPath(relativePath));
  if (stat.isFile()) return "file";
  if (stat.isDirectory()) return "directory";
  throw new Error("Unsupported entry type");
}

export async function localGetAllDirectories(
  relativePath = "",
): Promise<string[]> {
  const { items } = await localListDirectory(relativePath);
  const dirs: string[] = [];

  if (relativePath) {
    dirs.push(relativePath);
  }

  for (const item of items) {
    if (item.type === "directory") {
      const childPath = joinPath(relativePath, item.name);
      dirs.push(...(await localGetAllDirectories(childPath)));
    }
  }

  return dirs.sort();
}
