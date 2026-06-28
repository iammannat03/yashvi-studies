import Link from "next/link";
import { FileBrowser } from "@/components/file-browser";

export default function BrowsePage() {
  return (
    <div className="neo-page-bg min-h-full flex-1 px-6 py-10">
      <header className="mx-auto mb-8 max-w-4xl">
        <Link
          href="/"
          className="mb-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold">Files</h1>
        <p className="text-muted-foreground">
          Browse folders, upload HTML, and move files where you need them.
        </p>
      </header>
      <FileBrowser />
    </div>
  );
}
