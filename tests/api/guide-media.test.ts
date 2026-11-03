import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindFirst = vi.fn();
const mockAuth = vi.fn();

vi.mock("@/db", () => ({
  db: {
    query: {
      properties: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

import { GET, HEAD } from "@/app/api/guide-media/[...path]/route";
import {
  deriveGuideUnlockToken,
  guestAccessCookieName,
} from "@/lib/guest-access";

describe("GET/HEAD /api/guide-media/[...path]", () => {
  const sampleSegments = ["kith-1423", "assets", "garage-to-elevator.mp4"];
  const sampleDiskPath = path.resolve(
    process.cwd(),
    "public",
    "guide-media",
    ...sampleSegments,
  );
  const sampleBytes = fs.readFileSync(sampleDiskPath);

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "unit-test-secret-for-guide-media-32b";
    mockFindFirst.mockReset();
    mockAuth.mockReset();
    mockAuth.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({
      active: true,
      guestAccessCode: "KITH-2485",
    });
  });

  function unlockedCookieHeader(slug = "kith-1423", code = "KITH-2485") {
    const token = deriveGuideUnlockToken(slug, code);
    return `${guestAccessCookieName(slug)}=${token}`;
  }

  it("blocks unauthenticated requests for access-code-gated property media with 401", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
    );
    const res = await GET(req, { params: { path: sampleSegments } });

    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns 404 when property is inactive or missing", async () => {
    mockFindFirst.mockResolvedValueOnce({ active: false, guestAccessCode: "KITH-2485" });
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      { headers: { cookie: unlockedCookieHeader() } },
    );
    const res = await GET(req, { params: { path: sampleSegments } });
    expect(res.status).toBe(404);
  });

  it("allows authenticated staff session even without guest cookie", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "admin-1" } });
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/keys-and-fob.jpg",
    );
    const res = await GET(req, {
      params: { path: ["kith-1423", "assets", "keys-and-fob.jpg"] },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600, no-transform");
    expect(res.headers.get("vary")).toBe("Cookie");
  });

  it("returns 200 with full file bytes and private no-transform headers when unlocked", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      { headers: { cookie: unlockedCookieHeader() } },
    );
    const res = await GET(req, { params: { path: sampleSegments } });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("cache-control")).toBe("private, max-age=3600, no-transform");
    expect(res.headers.get("vary")).toBe("Cookie");
    expect(res.headers.get("content-length")).toBe(String(sampleBytes.length));

    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBe(sampleBytes.length);
    expect(buf.subarray(0, 64).equals(sampleBytes.subarray(0, 64))).toBe(true);
  });

  it("returns public Cache-Control when property has no guestAccessCode", async () => {
    mockFindFirst.mockResolvedValueOnce({ active: true, guestAccessCode: null });
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
    );
    const res = await HEAD(req, { params: { path: sampleSegments } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=86400, no-transform");
  });

  it("returns 206 Partial Content with exact byte slice for Range requests", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      {
        headers: {
          cookie: unlockedCookieHeader(),
          range: "bytes=100-1099",
        },
      },
    );
    const res = await GET(req, { params: { path: sampleSegments } });

    expect(res.status).toBe(206);
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-range")).toBe(`bytes 100-1099/${sampleBytes.length}`);
    expect(res.headers.get("content-length")).toBe("1000");

    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(sampleBytes.subarray(100, 1100))).toBe(true);
  });

  it("supports open-ended and suffix Range headers and rejects out-of-bounds with 416", async () => {
    const suffixReq = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      {
        headers: {
          cookie: unlockedCookieHeader(),
          range: "bytes=-256",
        },
      },
    );
    const suffixRes = await GET(suffixReq, { params: { path: sampleSegments } });
    expect(suffixRes.status).toBe(206);
    const suffixBuf = Buffer.from(await suffixRes.arrayBuffer());
    expect(suffixBuf.equals(sampleBytes.subarray(sampleBytes.length - 256))).toBe(true);

    const badReq = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      {
        headers: {
          cookie: unlockedCookieHeader(),
          range: `bytes=${sampleBytes.length + 100}-${sampleBytes.length + 200}`,
        },
      },
    );
    const badRes = await GET(badReq, { params: { path: sampleSegments } });
    expect(badRes.status).toBe(416);
    expect(badRes.headers.get("content-range")).toBe(`bytes */${sampleBytes.length}`);
  });

  it("supports HEAD without streaming body and blocks path traversal", async () => {
    const headReq = new NextRequest(
      "http://localhost:3000/api/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      {
        method: "HEAD",
        headers: {
          cookie: unlockedCookieHeader(),
          range: "bytes=0-511",
        },
      },
    );
    const headRes = await HEAD(headReq, { params: { path: sampleSegments } });
    expect(headRes.status).toBe(206);
    expect(headRes.headers.get("content-length")).toBe("512");
    expect((await headRes.arrayBuffer()).byteLength).toBe(0);

    const traversalReq = new NextRequest("http://localhost:3000/api/guide-media/../package.json");
    const traversalRes = await GET(traversalReq, { params: { path: ["..", "package.json"] } });
    expect(traversalRes.status).toBe(404);
  });
});
