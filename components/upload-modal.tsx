"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UploadModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (path: string) => void;
};

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".html")) {
        setError("Only .html files are allowed.");
        return;
      }

      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        onSuccess(data.path);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onClose, onSuccess],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="neo-card neo-dialog-content max-w-lg rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload HTML</DialogTitle>
          <DialogDescription>
            Drag and drop an HTML file or click to browse.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`neo-dropzone flex cursor-pointer flex-col items-center gap-3 rounded-lg px-6 py-12 ${dragging ? "neo-dropzone-active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-4xl">📄</span>
          <p className="text-center font-medium">
            {uploading ? "Uploading…" : "Drop your file here"}
          </p>
          <p className="text-sm text-muted-foreground">or click to browse (.html only)</p>
          <input
            ref={inputRef}
            type="file"
            accept=".html,text/html"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
        </div>

        {error && (
          <p className="text-center text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="neo-dialog-actions">
          <Button
            variant="outline"
            className="neo-btn neo-btn-outline rounded-lg"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
