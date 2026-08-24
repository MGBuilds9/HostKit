import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      cleaners: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          { id: "cleaner-1", fullName: "Jane Doe", email: "jane@test.com" },
        ]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      })),
    })),
  },
}));

import { GET, POST } from "@/app/api/cleaners/route";
import { GET as GET_ID } from "@/app/api/cleaners/[id]/route";
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

describe("GET /api/cleaners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET_ID(makeRequest(), { params: { id: "cleaner-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 403 for unauthorized role like owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    const res = await GET_ID(makeRequest(), { params: { id: "cleaner-1" } });
    expect(res.status).toBe(403);
  });

  it("returns 403 when a cleaner attempts to access another cleaner record", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-cleaner-1", role: "cleaner" } });
    (db.query.cleaners.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cleaner-2",
      userId: "user-cleaner-2",
      fullName: "Other Cleaner",
    });

    const res = await GET_ID(makeRequest(), { params: { id: "cleaner-2" } });
    expect(res.status).toBe(403);
  });

  it("returns 200 when a cleaner accesses their own cleaner record", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-cleaner-1", role: "cleaner" } });
    (db.query.cleaners.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "cleaner-1",
      userId: "user-cleaner-1",
      fullName: "Self Cleaner",
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 5 }])),
      })),
    });

    const res = await GET_ID(makeRequest(), { params: { id: "cleaner-1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fullName).toBe("Self Cleaner");
    expect(json.taskCount).toBe(5);
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
