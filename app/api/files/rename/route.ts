import { NextRequest, NextResponse } from "next/server";
import { ensureUploadsRoot, renameEntry } from "@/lib/uploads";

export async function PATCH(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const body = await request.json();
    const filePath = typeof body.path === "string" ? body.path.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!filePath || !name) {
      return NextResponse.json(
        { error: "Both path and name are required" },
        { status: 400 },
      );
    }

    const newPath = await renameEntry(filePath, name);
    return NextResponse.json({ path: newPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to rename";
    const status = message.includes("EEXIST") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
