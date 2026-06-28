import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs/promises";
import { stripHtmlExtension } from "@/lib/file-names";
import {
  resolveUploadPath,
  validateHtmlViewPath,
} from "@/lib/uploads";

type ViewPageProps = {
  searchParams: Promise<{ path?: string }>;
};

export default async function ViewPage({ searchParams }: ViewPageProps) {
  const { path: pathParam } = await searchParams;

  if (!pathParam) {
    notFound();
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(pathParam);
  } catch {
    notFound();
  }

  let validatedPath: string;
  try {
    validatedPath = validateHtmlViewPath(relativePath);
    await fs.access(resolveUploadPath(validatedPath));
  } catch {
    notFound();
  }

  const fileName = validatedPath.split("/").pop() ?? validatedPath;
  const displayName = stripHtmlExtension(fileName);
  const iframeSrc = `/uploads/${validatedPath.split("/").map(encodeURIComponent).join("/")}`;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center gap-4 border-b-2 border-foreground bg-card px-4 py-3 shadow-[0_4px_0_0_#0a0a0a]">
        <Link
          href="/browse"
          className="neo-btn neo-btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          ← Back
        </Link>
        <span className="truncate font-medium">{displayName}</span>
      </header>
      <iframe
        src={iframeSrc}
        title={displayName}
        className="min-h-0 flex-1 w-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
