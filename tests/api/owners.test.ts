import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      owners: { findMany: vi.fn(), findFirst: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([
          { id: "owner-1", name: "John Owner", email: "john@test.com" },
        ]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            { id: "owner-1", name: "Updated Owner" },
          ]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "owner-1" }]),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ value: 0 }])),
      })),
    })),
  },
}));

import { GET, POST } from "@/app/api/owners/route";
import { GET as GET_ID, PUT, DELETE } from "@/app/api/owners/[id]/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function makeRequest(opts?: { method?: string; body?: unknown; url?: string }) {
  return new Request(opts?.url ?? "http://localhost/api/owners", {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

const params = { params: { id: "owner-1" } };

describe("GET /api/owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for owner role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns owners list for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const mockOwners = [{ id: "o1", name: "Alice" }];
    (db.query.owners.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockOwners);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockOwners);
  });
});

describe("POST /api/owners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for owner role", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(403);
  });

  it("returns 400 with invalid body", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await POST(makeRequest({ method: "POST", body: { name: "" } }));
    expect(res.status).toBe(400);
  });

  it("creates owner and returns 201", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { name: "John Owner", email: "john@test.com" },
      })
    );
    expect(res.status).toBe(201);
  });
});

describe("PUT /api/owners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makeRequest({ method: "PUT", body: {} }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin/manager", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "cleaner" } });
    const res = await PUT(makeRequest({ method: "PUT", body: {} }), params);
    expect(res.status).toBe(403);
  });

  it("updates owner and returns 200", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    const res = await PUT(
      makeRequest({ method: "PUT", body: { name: "Updated Owner" } }),
      params
    );
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/owners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest({ method: "DELETE" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin/manager", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    const res = await DELETE(makeRequest({ method: "DELETE" }), params);
    expect(res.status).toBe(403);
  });

  it("deletes owner with no linked properties", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    // propertyCount = 0 (default mock returns [{ value: 0 }])
    const res = await DELETE(makeRequest({ method: "DELETE" }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 409 when owner has linked properties", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    // Override select mock to return propertyCount = 2
    (db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ value: 2 }])),
      })),
    });

    const res = await DELETE(makeRequest({ method: "DELETE" }), params);
    expect(res.status).toBe(409);
  });
});
