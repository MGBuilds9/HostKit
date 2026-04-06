import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, getPublicUrl, MAX_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES } from "@/lib/s3";
import { randomUUID } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

const uploadLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });

export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = uploadLimiter.check(ip);
  if (!limit.success) {
    const retryAfter = Math.ceil((limit.resetAt.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { filename, contentType, size } = body;

  if (!filename || !contentType) {
    return NextResponse.json({ error: "filename and contentType required" }, { status: 400 });
  }

  const isVideo = contentType?.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  const maxLabel = isVideo ? "200MB" : "10MB";

  if (typeof size === "number" && size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${maxLabel}.` },
      { status: 400 }
    );
  }

  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "video/mp4",
    "video/quicktime",
  ];
  if (!allowed.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `checkin-media/${randomUUID()}.${ext}`;

  const uploadUrl = await getPresignedUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
