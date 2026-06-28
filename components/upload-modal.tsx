"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildClaudePrompt } from "@/lib/claude-prompt-template";
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

type UploadModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (path: string) => void;
};

type UploadMode = "generate" | "direct";
type GenerateStep = 1 | 2 | 3;

const DEFAULT_FORM = {
  grade: "10",
  board: "CBSE",
  subject: "",
  syllabus: "",
};

function StepIndicator({ step }: { step: GenerateStep }) {
  const steps = [
    { num: 1, label: "Syllabus" },
    { num: 2, label: "Claude prompt" },
    { num: 3, label: "Upload" },
  ];

  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {steps.map(({ num, label }, i) => (
        <div key={num} className="flex items-center gap-2">
          {i > 0 && (
            <span
              className={`h-0.5 w-6 sm:w-10 ${step > num - 1 ? "bg-foreground" : "bg-muted-foreground/30"}`}
            />
          )}
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                step >= num
                  ? "border-foreground bg-primary text-foreground"
                  : "border-muted-foreground/40 bg-muted text-muted-foreground"
              }`}
            >
              {num}
            </span>
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">
              {label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function UploadDropzone({
  uploading,
  error,
  onUpload,
}: {
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload],
  );

  return (
    <>
      <div
        className={`neo-dropzone flex cursor-pointer flex-col items-center gap-3 rounded-lg px-6 py-10 ${dragging ? "neo-dropzone-active" : ""}`}
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
          {uploading ? "Uploading…" : "Drop your HTML file here"}
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse (.html only)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".html,text/html"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </div>
      {error && (
        <p className="mt-3 text-center text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [mode, setMode] = useState<UploadMode>("generate");
  const [step, setStep] = useState<GenerateStep>(1);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setMode("generate");
    setStep(1);
    setForm(DEFAULT_FORM);
    setCopied(false);
    setUploading(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

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
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
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

  const prompt = buildClaudePrompt(form);
  const canProceedStep1 = form.syllabus.trim().length > 0;

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard. Select and copy the prompt manually.");
    }
  };

  const switchMode = (next: UploadMode) => {
    setMode(next);
    setStep(1);
    setError(null);
    setCopied(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className={`neo-card neo-dialog-content rounded-xl border-2 border-foreground shadow-[4px_4px_0_0_#0a0a0a] ${
          mode === "generate" && step === 2
            ? "max-w-2xl sm:max-w-2xl"
            : "max-w-lg sm:max-w-lg"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload HTML</DialogTitle>
          <DialogDescription>
            {mode === "generate"
              ? "Generate a study page with Claude, then upload it here."
              : "Upload an existing HTML study file."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-lg border-2 border-foreground bg-muted p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "generate"
                ? "bg-primary text-foreground shadow-[2px_2px_0_0_#0a0a0a]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => switchMode("generate")}
          >
            Generate with Claude
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              mode === "direct"
                ? "bg-primary text-foreground shadow-[2px_2px_0_0_#0a0a0a]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => switchMode("direct")}
          >
            Upload directly
          </button>
        </div>

        {mode === "direct" ? (
          <UploadDropzone
            uploading={uploading}
            error={error}
            onUpload={uploadFile}
          />
        ) : (
          <>
            <StepIndicator step={step} />

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Step 1 — Tell us what to study. This will be included in the
                  Claude prompt.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Class / Grade</Label>
                    <Input
                      id="grade"
                      value={form.grade}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, grade: e.target.value }))
                      }
                      placeholder="e.g. 10"
                      className="neo-input h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="board">Board</Label>
                    <Input
                      id="board"
                      value={form.board}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, board: e.target.value }))
                      }
                      placeholder="e.g. CBSE"
                      className="neo-input h-10 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subject: e.target.value }))
                    }
                    placeholder="e.g. Social Studies (SST)"
                    className="neo-input h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="syllabus">Topics &amp; syllabus</Label>
                  <textarea
                    id="syllabus"
                    value={form.syllabus}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, syllabus: e.target.value }))
                    }
                    placeholder={`e.g.\nNationalism in India (History)\nDevelopment (Economics)\nResources and Development (Geography)\nPower Sharing (Civics)`}
                    rows={6}
                    className="neo-input w-full resize-y rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="neo-dialog-actions">
                  <Button
                    variant="outline"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="neo-btn neo-btn-primary rounded-lg"
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                  >
                    Next: Get prompt
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Step 2 — Generate your study page in Claude
                </p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-semibold text-foreground">1.</span>{" "}
                    Click <strong>Copy prompt</strong> below.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">2.</span>{" "}
                    Open{" "}
                    <a
                      href="https://claude.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground underline"
                    >
                      claude.ai
                    </a>{" "}
                    in a new tab and start a new chat.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">3.</span>{" "}
                    Paste the prompt and send it. Claude will generate MCQs,
                    short answers, and long answers for your syllabus.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">4.</span>{" "}
                    Ask Claude to put everything into an HTML file if it
                    hasn&apos;t already — the prompt requests this automatically.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">5.</span>{" "}
                    <strong>Download</strong> the generated HTML file from
                    Claude (use the download button on the file artifact).
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">6.</span>{" "}
                    Come back here and click <strong>Next: Upload file</strong>.
                  </li>
                </ol>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="prompt-preview">Your prompt</Label>
                    <Button
                      type="button"
                      size="sm"
                      className="neo-btn neo-btn-secondary rounded-lg"
                      onClick={copyPrompt}
                    >
                      {copied ? "Copied!" : "Copy prompt"}
                    </Button>
                  </div>
                  <textarea
                    id="prompt-preview"
                    readOnly
                    value={prompt}
                    rows={10}
                    className="neo-input w-full resize-y rounded-lg px-3 py-2 font-mono text-xs leading-relaxed"
                    onClick={(e) => e.currentTarget.select()}
                  />
                </div>

                {error && (
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}

                <div className="neo-dialog-actions">
                  <Button
                    variant="outline"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    className="neo-btn neo-btn-primary rounded-lg"
                    onClick={() => {
                      setError(null);
                      setStep(3);
                    }}
                  >
                    Next: Upload file
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Step 3 — Upload the HTML file you downloaded from Claude.
                </p>
                <UploadDropzone
                  uploading={uploading}
                  error={error}
                  onUpload={uploadFile}
                />
                <div className="neo-dialog-actions">
                  <Button
                    variant="outline"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={() => setStep(2)}
                    disabled={uploading}
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    className="neo-btn neo-btn-outline rounded-lg"
                    onClick={onClose}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === "direct" && (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
