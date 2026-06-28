import { NextRequest, NextResponse } from "next/server";
import {
  createDirectory,
  deleteEntry,
  ensureUploadsRoot,
  getAllDirectories,
  listDirectory,
} from "@/lib/uploads";

export async function GET(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const pathParam = request.nextUrl.searchParams.get("path") ?? "";
    const allDirectories =
      request.nextUrl.searchParams.get("allDirectories") === "true";

    if (allDirectories) {
      const directories = await getAllDirectories();
      return NextResponse.json({ directories: ["", ...directories] });
    }

    const result = await listDirectory(pathParam);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list files";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const body = await request.json();
    const parentPath = typeof body.path === "string" ? body.path : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 },
      );
    }

    await createDirectory(parentPath, name);
    const folderPath = parentPath ? `${parentPath}/${name}` : name;
    return NextResponse.json({ path: folderPath });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create folder";
    const status = message.includes("EEXIST") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const body = await request.json();
    const itemPath = typeof body.path === "string" ? body.path.trim() : "";

    if (!itemPath) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 },
      );
    }

    await deleteEntry(itemPath);
    return NextResponse.json({ path: itemPath });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete item";
    const status = message.includes("ENOENT") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
