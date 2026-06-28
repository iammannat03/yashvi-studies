import { NextRequest, NextResponse } from "next/server";
import { ensureUploadsRoot, moveEntry } from "@/lib/uploads";

export async function PATCH(request: NextRequest) {
  try {
    await ensureUploadsRoot();
    const body = await request.json();
    const from = typeof body.from === "string" ? body.from : "";
    const to = typeof body.to === "string" ? body.to : "";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Both from and to paths are required" },
        { status: 400 },
      );
    }

    await moveEntry(from, to);
    return NextResponse.json({ path: to });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to move item";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
