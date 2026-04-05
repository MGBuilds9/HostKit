import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so the variable is available inside the vi.mock factory
const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn().mockReturnValue({ success: true, remaining: 9, resetAt: new Date() }),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  getPresignedUploadUrl: vi.fn().mockResolvedValue("https://minio.example.com/upload?sig=abc"),
  getPublicUrl: vi.fn().mockReturnValue("https://minio.example.com/checkin-media/file.jpg"),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ check: mockCheck })),
}));

import { POST } from "@/app/api/upload/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheck.mockReturnValue({ success: true, remaining: 9, resetAt: new Date() });
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheck.mockReturnValue({ success: false, remaining: 0, resetAt: new Date(Date.now() + 30_000) });
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const res = await POST(makeRequest({ filename: "test.jpg", contentType: "image/jpeg" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makeRequest({ filename: "test.jpg", contentType: "image/jpeg" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for owner role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });

    const res = await POST(makeRequest({ filename: "test.jpg", contentType: "image/jpeg" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when filename is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const res = await POST(makeRequest({ contentType: "image/jpeg" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/filename/i);
  });

  it("returns 400 when contentType is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const res = await POST(makeRequest({ filename: "photo.jpg" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported content type", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const res = await POST(
      makeRequest({ filename: "script.exe", contentType: "application/octet-stream" })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unsupported/i);
  });

  it("returns 400 for files over 10MB", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const overLimit = 11 * 1024 * 1024;

    const res = await POST(
      makeRequest({ filename: "big.jpg", contentType: "image/jpeg", size: overLimit })
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too large/i);
  });

  it("returns presigned URL for valid request", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

    const res = await POST(
      makeRequest({ filename: "photo.jpg", contentType: "image/jpeg", size: 1024 * 1024 })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadUrl).toBeDefined();
    expect(json.publicUrl).toBeDefined();
    expect(json.key).toMatch(/^checkin-media\//);
  });

  it("accepts all allowed content types", async () => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "video/mp4",
      "video/quicktime",
    ];

    for (const contentType of allowedTypes) {
      mockCheck.mockReturnValue({ success: true, remaining: 9, resetAt: new Date() });
      mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });

      const res = await POST(makeRequest({ filename: "file.bin", contentType }));
      expect(res.status).toBe(200);
    }
  });
});
