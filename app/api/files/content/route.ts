import { NextRequest, NextResponse } from "next/server";
import {
  assertHtmlFileExists,
  getFileContent,
} from "@/lib/uploads";

export async function GET(request: NextRequest) {
  try {
    const pathParam = request.nextUrl.searchParams.get("path");
    if (!pathParam) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    let relativePath: string;
    try {
      relativePath = decodeURIComponent(pathParam);
    } catch {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const validatedPath = await assertHtmlFileExists(relativePath);
    const content = await getFileContent(validatedPath);

    return new NextResponse(new Uint8Array(content), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
