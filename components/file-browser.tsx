"use client";

import Link from "next/link";
import { FolderIcon, FileIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  buildViewUrl,
  formatPathForDisplay,
  stripHtmlExtension,
} from "@/lib/file-names";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadModal } from "@/components/upload-modal";

type FileItem = {
  name: string;
  type: "file" | "directory";
  size?: number;
  updatedAt?: string;
};

type ListResponse = {
  path: string;
  items: FileItem[];
};

const ROOT_VALUE = "__root__";

function formatPath(path: string): string {
  return path || "Root";
}

function breadcrumbSegments(path: string): { label: string; path: string }[] {
  if (!path) return [{ label: "Root", path: "" }];
  const parts = path.split("/");
  return [
    { label: "Root", path: "" },
    ...parts.map((part, i) => ({
      label: part,
      path: parts.slice(0, i + 1).join("/"),
    })),
  ];
}

function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function FileBrowser() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    path: string;
    type: "file" | "directory";
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{
    path: string;
    name: string;
    type: "file" | "directory";
  } | null>(null);
  const [renameName, setRenameName] = useState("");
  const [directories, setDirectories] = useState<string[]>([]);
  const [selectedDest, setSelectedDest] = useState(ROOT_VALUE);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const fetchDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      const data: ListResponse = await res.json();
      if (!res.ok)
        throw new Error((data as { error?: string }).error ?? "Failed to load");
      setCurrentPath(data.path);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDirectories = useCallback(async () => {
    const res = await fetch("/api/files?allDirectories=true");
    const data = await res.json();
    if (res.ok) setDirectories(data.directories ?? [""]);
  }, []);

  useEffect(() => {
    fetchDirectory(currentPath);
  }, [currentPath, fetchDirectory]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentPath, name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create folder");
      setNewFolderOpen(false);
      setNewFolderName("");
      await fetchDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setActionLoading(false);
    }
  };

  const openMoveDialog = async (itemPath: string) => {
    setMoveTarget(itemPath);
    setSelectedDest(ROOT_VALUE);
    await fetchDirectories();
  };

  const moveItem = async () => {
    if (!moveTarget) return;
    const fileName = moveTarget.split("/").pop() ?? moveTarget;
    const destFolder = selectedDest === ROOT_VALUE ? "" : selectedDest;
    const destPath = destFolder ? `${destFolder}/${fileName}` : fileName;

    setActionLoading(true);
    try {
      const res = await fetch("/api/files/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: moveTarget, to: destPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to move");
      setMoveTarget(null);
      await fetchDirectory(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move");
    } finally {
      setActionLoading(false);
    }
  };

  const openRenameDialog = (
    itemPath: string,
    name: string,
    type: "file" | "directory",
  ) => {
    setRenameTarget({ path: itemPath, name, type });
    setRenameName(type === "file" ? stripHtmlExtension(name) : name);
  };

  const renameItem = async () => {
    if (!renameTarget || !renameName.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/files/rename", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: renameTarget.path,
          name: renameName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename");

      const oldPath = renameTarget.path;
      const newPath = data.path as string;

      if (currentPath === oldPath) {
        setCurrentPath(newPath);
      } else if (currentPath.startsWith(`${oldPath}/`)) {
        setCurrentPath(currentPath.replace(oldPath, newPath));
      } else {
        await fetchDirectory(currentPath);
      }

      setRenameTarget(null);
      setRenameName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteItem = async () => {
    if (!deleteTarget) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: deleteTarget.path }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      setDeleteTarget(null);
      await fetchDirectory(currentPath);
      await fetchDirectories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  };

  const crumbs = breadcrumbSegments(currentPath);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="neo-card mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl p-4">
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <button
                type="button"
                className="font-medium hover:underline"
                onClick={() => setCurrentPath(crumb.path)}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="neo-btn neo-btn-outline rounded-lg"
            onClick={() => setUploadOpen(true)}
          >
            Upload HTML
          </Button>
          <Button
            className="neo-btn neo-btn-primary rounded-lg"
            onClick={() => setNewFolderOpen(true)}
          >
            + New Folder
          </Button>
        </div>
      </div>

      {uploadMessage && (
        <div className="mb-4 rounded-lg border-2 border-foreground bg-accent px-4 py-3 text-sm font-medium shadow-[2px_2px_0_0_#0a0a0a]">
          {uploadMessage}
        </div>
      )}

      <p className="mb-4 text-sm text-muted-foreground">
        Current folder:{" "}
        <span className="font-semibold text-foreground">
          {formatPath(currentPath)}
        </span>
      </p>

      {error && (
        <div className="mb-4 rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-[2px_2px_0_0_#0a0a0a]">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="neo-card rounded-xl py-16 text-center text-muted-foreground">
          <p className="font-medium text-foreground">This folder is empty</p>
          <p className="mt-1 text-sm">
            Upload an HTML file here or create a folder to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const itemPath = currentPath
              ? `${currentPath}/${item.name}`
              : item.name;

            if (item.type === "directory") {
              return (
                <div
                  key={itemPath}
                  className="neo-card flex items-start justify-between gap-3 rounded-xl p-5"
                >
                  <button
                    type="button"
                    className="group flex flex-1 items-start gap-4 text-left"
                    onClick={() => setCurrentPath(itemPath)}
                  >
                    <FolderIcon
                      className="size-8 shrink-0 text-primary"
                      strokeWidth={2.5}
                    />
                    <div>
                      <p className="font-semibold group-hover:underline">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground">Folder</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="neo-btn neo-btn-outline rounded-lg"
                      onClick={() =>
                        openRenameDialog(itemPath, item.name, "directory")
                      }
                    >
                      Rename
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="neo-btn rounded-lg border-2 border-foreground bg-destructive text-white shadow-[2px_2px_0_0_#0a0a0a] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                      onClick={() =>
                        setDeleteTarget({ path: itemPath, type: "directory" })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={itemPath}
                className="neo-card flex items-start justify-between gap-3 rounded-xl p-5"
              >
                <Link
                  href={buildViewUrl(itemPath)}
                  className="flex flex-1 items-start gap-4"
                >
                  <FileIcon
                    className="size-8 shrink-0 text-secondary-foreground"
                    strokeWidth={2.5}
                  />
                  <div>
                    <p className="font-semibold hover:underline">
                      {stripHtmlExtension(item.name)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(item.size)}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={() =>
                      openRenameDialog(itemPath, item.name, "file")
                    }
                  >
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={() => openMoveDialog(itemPath)}
                  >
                    Move
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="neo-btn rounded-lg border-2 border-foreground bg-destructive text-white shadow-[2px_2px_0_0_#0a0a0a] hover:translate-x-px hover:translate-y-px hover:shadow-none"
                    onClick={() =>
                      setDeleteTarget({ path: itemPath, type: "file" })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="neo-card neo-dialog-content max-w-md rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Folder</DialogTitle>
            <DialogDescription>
              Create a folder inside {formatPath(currentPath)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. math"
              className="neo-input h-10 rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
            />
          </div>
          <div className="neo-dialog-actions">
            <Button
              variant="outline"
              className="neo-btn neo-btn-outline rounded-lg"
              onClick={() => {
                setNewFolderOpen(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="neo-btn neo-btn-primary rounded-lg"
              onClick={createFolder}
              disabled={actionLoading || !newFolderName.trim()}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      >
        <DialogContent className="neo-card neo-dialog-content max-w-md rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Move File</DialogTitle>
            <DialogDescription className="break-all">
              Moving{" "}
              <span className="font-semibold text-foreground">
                {moveTarget ? formatPathForDisplay(moveTarget) : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dest-folder">Destination folder</Label>
            <Select
              value={selectedDest}
              onValueChange={(v) => setSelectedDest(v ?? ROOT_VALUE)}
            >
              <SelectTrigger
                id="dest-folder"
                className="neo-select-trigger w-full"
              >
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent className="neo-select-content">
                <SelectItem value={ROOT_VALUE}>Root</SelectItem>
                {directories
                  .filter((d) => d !== "")
                  .map((dir) => (
                    <SelectItem key={dir} value={dir}>
                      {dir}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="neo-dialog-actions">
            <Button
              variant="outline"
              className="neo-btn neo-btn-outline rounded-lg"
              onClick={() => setMoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="neo-btn neo-btn-primary rounded-lg"
              onClick={moveItem}
              disabled={actionLoading}
            >
              Move
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="neo-card neo-dialog-content max-w-md rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {deleteTarget?.type === "directory"
                ? "Delete Folder"
                : "Delete File"}
            </DialogTitle>
            <DialogDescription className="break-all">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget
                  ? formatPathForDisplay(deleteTarget.path)
                  : ""}
              </span>
              ?
              {deleteTarget?.type === "directory"
                ? " All files and subfolders inside will be permanently removed."
                : " This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="neo-dialog-actions">
            <Button
              variant="outline"
              className="neo-btn neo-btn-outline rounded-lg"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="neo-btn rounded-lg border-2 border-foreground bg-destructive text-white"
              onClick={deleteItem}
              disabled={actionLoading}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null);
            setRenameName("");
          }
        }}
      >
        <DialogContent className="neo-card neo-dialog-content max-w-md rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Rename {renameTarget?.type === "directory" ? "Folder" : "File"}
            </DialogTitle>
            <DialogDescription className="break-all">
              Renaming{" "}
              <span className="font-semibold text-foreground">
                {renameTarget ? formatPathForDisplay(renameTarget.path) : ""}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-name">New name</Label>
            <Input
              id="rename-name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder={
                renameTarget?.type === "directory"
                  ? "e.g. SST Notes"
                  : "e.g. My Notes"
              }
              className="neo-input h-10 rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && renameItem()}
            />
          </div>
          <div className="neo-dialog-actions">
            <Button
              variant="outline"
              className="neo-btn neo-btn-outline rounded-lg"
              onClick={() => {
                setRenameTarget(null);
                setRenameName("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="neo-btn neo-btn-primary rounded-lg"
              onClick={renameItem}
              disabled={actionLoading || !renameName.trim()}
            >
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        targetPath={currentPath}
        onSuccess={async (path) => {
          setUploadMessage(`"${path}" uploaded successfully.`);
          await fetchDirectory(currentPath);
        }}
      />
    </div>
  );
}
