"use client";

import Link from "next/link";
import { useState } from "react";
import { UploadModal } from "@/components/upload-modal";

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="neo-page-bg flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="neo-card flex max-w-xl flex-col items-center rounded-xl p-10 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-4xl shadow-[3px_3px_0_0_#0a0a0a]">
          📚
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Yashvi Studies
        </h1>

        <p className="mb-8 max-w-sm text-muted-foreground">
          Upload, organize, and open your HTML study files in one place.
        </p>

        {message && (
          <div className="mb-6 w-full rounded-lg border-2 border-foreground bg-accent px-4 py-3 text-sm font-medium shadow-[2px_2px_0_0_#0a0a0a]">
            {message}
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/browse"
            className="neo-btn neo-btn-primary rounded-lg px-8 py-3 text-sm"
          >
            Browse
          </Link>
          <button
            type="button"
            className="neo-btn neo-btn-outline rounded-lg px-8 py-3 text-sm"
            onClick={() => setUploadOpen(true)}
          >
            Upload HTML
          </button>
        </div>
      </main>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(path) =>
          setMessage(`"${path}" uploaded successfully.`)
        }
      />
    </div>
  );
}
