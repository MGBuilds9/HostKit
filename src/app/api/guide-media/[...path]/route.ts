import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  guestAccessCookieName,
  verifyGuideUnlockCookie,
} from "@/lib/guest-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

function resolveGuideMediaPath(segments: string[]): { baseDir: string; resolved: string } | null {
  if (!segments || segments.length < 2) return null;
  for (const seg of segments) {
    if (
      !seg ||
      seg === "." ||
      seg === ".." ||
      seg.includes("\0") ||
      seg.includes("/") ||
      seg.includes("\\")
    ) {
      return null;
    }
  }
  const baseDir = path.resolve(process.cwd(), "public", "guide-media");
  const resolved = path.resolve(baseDir, ...segments);
  if (!resolved.startsWith(baseDir + path.sep)) return null;
  return { baseDir, resolved };
}

function parseByteRange(
  rangeHeader: string,
  totalSize: number,
): { start: number; end: number } | "unsatisfiable" | null {
  if (!rangeHeader.startsWith("bytes=")) return null;
  const spec = rangeHeader.slice("bytes=".length).split(",")[0]?.trim();
  if (!spec || !spec.includes("-")) return null;

  const [startStr, endStr] = spec.split("-", 2);
  if (startStr === "" && endStr === "") return "unsatisfiable";

  if (startStr === "") {
    const suffixLength = Number(endStr);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return "unsatisfiable";
    const start = Math.max(0, totalSize - suffixLength);
    return { start, end: totalSize - 1 };
  }

  const start = Number(startStr);
  const end = endStr === "" ? totalSize - 1 : Number(endStr);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= totalSize ||
    end < start
  ) {
    return "unsatisfiable";
  }

  return { start, end: Math.min(end, totalSize - 1) };
}

function createFileWebStream(
  filePath: string,
  start: number,
  end: number,
): ReadableStream<Uint8Array> {
  let nodeStream: fs.ReadStream | null = null;
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream = fs.createReadStream(filePath, { start, end });
      nodeStream.on("data", (chunk: Buffer | string) => {
        if (closed) return;
        const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
        controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
        if ((controller.desiredSize ?? 0) <= 0) {
          nodeStream?.pause();
        }
      });
      nodeStream.on("end", () => {
        if (closed) return;
        closed = true;
        controller.close();
      });
      nodeStream.on("error", (err) => {
        if (closed) return;
        closed = true;
        controller.error(err);
      });
    },
    pull() {
      if (!closed) {
        nodeStream?.resume();
      }
    },
    cancel() {
      closed = true;
      if (nodeStream) {
        nodeStream.destroy();
        nodeStream = null;
      }
    },
  });
}

type MediaAuthResult =
  | { status: "ok"; gated: boolean }
  | { status: "not_found" }
  | { status: "unauthorized" };

async function authorizePropertyMedia(
  request: NextRequest,
  slug: string,
): Promise<MediaAuthResult> {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    columns: { active: true, guestAccessCode: true },
  });

  if (!property || !property.active) {
    return { status: "not_found" };
  }

  if (!property.guestAccessCode) {
    return { status: "ok", gated: false };
  }

  const cookieVal = request.cookies.get(guestAccessCookieName(slug))?.value;
  if (verifyGuideUnlockCookie(slug, property.guestAccessCode, cookieVal)) {
    return { status: "ok", gated: true };
  }

  const session = await auth();
  if (session?.user?.id) {
    return { status: "ok", gated: true };
  }

  return { status: "unauthorized" };
}

async function handleMediaRequest(
  request: NextRequest,
  segments: string[],
  includeBody: boolean,
): Promise<NextResponse> {
  const resolvedPaths = resolveGuideMediaPath(segments);
  if (!resolvedPaths) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const ext = path.extname(resolvedPaths.resolved).toLowerCase();
  const contentType = MIME_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const slug = segments[0]!;
  const authResult = await authorizePropertyMedia(request, slug);
  if (authResult.status === "not_found") {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (authResult.status === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  let realBase: string;
  let realFile: string;
  let stat: fs.Stats;
  try {
    [realBase, realFile] = await Promise.all([
      fsp.realpath(resolvedPaths.baseDir),
      fsp.realpath(resolvedPaths.resolved),
    ]);
    if (!realFile.startsWith(realBase + path.sep)) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
    }
    stat = await fsp.stat(realFile);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (!stat.isFile() || stat.size === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  const totalSize = stat.size;
  const etag = `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  // no-transform stops CDNs/proxies from gzip-compressing streams (which breaks
  // byte-range seeking in Safari/Chrome); private + Vary: Cookie prevents shared
  // proxy caching of access-code-gated media while allowing browser range caching.
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": authResult.gated
      ? "private, max-age=3600, no-transform"
      : "public, max-age=86400, no-transform",
    ...(authResult.gated ? { Vary: "Cookie" } : {}),
    ETag: etag,
    "Last-Modified": stat.mtime.toUTCString(),
  };

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const parsed = parseByteRange(rangeHeader, totalSize);
    if (parsed === "unsatisfiable") {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes */${totalSize}`,
        },
      });
    }
    if (parsed) {
      const { start, end } = parsed;
      const chunkLength = end - start + 1;
      const headers = {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Length": String(chunkLength),
      };
      if (!includeBody) {
        return new NextResponse(null, { status: 206, headers });
      }
      return new NextResponse(createFileWebStream(realFile, start, end), {
        status: 206,
        headers,
      });
    }
  }

  const headers = {
    ...baseHeaders,
    "Content-Length": String(totalSize),
  };
  if (!includeBody) {
    return new NextResponse(null, { status: 200, headers });
  }
  return new NextResponse(createFileWebStream(realFile, 0, totalSize - 1), {
    status: 200,
    headers,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return handleMediaRequest(request, params.path, true);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return handleMediaRequest(request, params.path, false);
}
