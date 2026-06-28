import { NextRequest, NextResponse } from "next/server";
import { ensureUploadsRoot, saveUploadedFile } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const formData = await request.formData();
    const file = formData.get("file");
    const subPath = formData.get("path");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const savedPath = await saveUploadedFile(
      buffer,
      file.name,
      typeof subPath === "string" ? subPath : "",
    );

    return NextResponse.json({ path: savedPath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
