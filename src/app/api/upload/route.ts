import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { filename, contentType } = body;

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];
  if (!allowed.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `checkin-media/${randomUUID()}.${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
