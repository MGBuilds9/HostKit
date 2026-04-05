import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      cleaners: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          { id: "cleaner-1", fullName: "Jane Doe", email: "jane@test.com" },
        ]),
      })),
    })),
  },
}));

import { GET, POST } from "@/app/api/cleaners/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/cleaners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

describe("GET /api/cleaners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin/manager roles", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "cleaner" } });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for owner role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns cleaners list for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const mockCleaners = [{ id: "c1", fullName: "Jane Doe" }];
    (db.query.cleaners.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCleaners);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockCleaners);
  });

  it("returns cleaners list for manager", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2", role: "manager" } });
    (db.query.cleaners.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("POST /api/cleaners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ fullName: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin/manager", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "cleaner" } });
    const res = await POST(makeRequest({ fullName: "Test" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("creates cleaner with valid body and returns 201", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await POST(makeRequest({ fullName: "Jane Doe" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.fullName).toBe("Jane Doe");
  });
});
