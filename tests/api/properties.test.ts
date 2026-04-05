import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth and db before importing route handlers
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      owners: { findFirst: vi.fn(), findMany: vi.fn() },
      properties: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "prop-1", name: "Test Property" }]),
      })),
    })),
  },
}));

import { GET, POST } from "@/app/api/properties/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function makeRequest(opts?: { method?: string; body?: unknown }) {
  return new Request("http://localhost/api/properties", {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

describe("GET /api/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns properties list for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin", email: "admin@test.com" } });
    const mockProperties = [{ id: "p1", name: "Beach House" }];
    (db.query.properties.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProperties);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockProperties);
  });

  it("filters properties for owner role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u2", role: "owner", email: "owner@test.com" },
    });
    const mockOwner = { id: "owner-1" };
    const mockProperties = [{ id: "p2", name: "Owner Property" }];
    (db.query.owners.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockOwner);
    (db.query.properties.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProperties);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockProperties);
  });

  it("returns empty array for owner with no linked record", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u3", role: "owner", email: "orphan@test.com" },
    });
    (db.query.owners.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual([]);
  });
});

describe("POST /api/properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner", email: "owner@test.com" } });
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin", email: "admin@test.com" } });
    const res = await POST(makeRequest({ method: "POST", body: { name: "" } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("creates property and returns 201", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin", email: "admin@test.com" } });

    const validBody = {
      name: "New Property",
      ownerId: "123e4567-e89b-12d3-a456-426614174000",
      addressStreet: "123 Main St",
      addressCity: "Toronto",
      addressProvince: "ON",
      addressPostal: "M5V 2T6",
    };

    const res = await POST(makeRequest({ method: "POST", body: validBody }));
    expect(res.status).toBe(201);
  });
});
