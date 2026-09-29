import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockSync = vi.fn();
vi.mock("@/lib/ical-sync", () => ({
  syncPropertyCalendar: (...a: unknown[]) => mockSync(...a),
}));

const mockPropertyLimit = vi.fn();
const mockOwnerLimit = vi.fn();
const mockSelect = vi.fn((...args: unknown[]): { from: unknown } => {
  const cols = args[0] as Record<string, unknown> | undefined;
  const keys = cols ? Object.keys(cols) : [];
  if (keys.includes("ownerId")) {
    return { from: () => ({ where: () => ({ limit: mockPropertyLimit }) }) };
  }
  if (keys.includes("userId")) {
    return { from: () => ({ where: () => ({ limit: mockOwnerLimit }) }) };
  }
  return { from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([]) }) }) };
});

vi.mock("@/db", () => ({
  db: { select: (...a: unknown[]) => mockSelect(...a) },
}));

import { POST } from "@/app/api/properties/[id]/sync/route";

const PARAMS = { params: { id: "prop-1" } };

function req() {
  return new NextRequest("http://localhost/api/properties/prop-1/sync", { method: "POST" });
}

describe("POST /api/properties/[id]/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyLimit.mockResolvedValue([{ ownerId: "owner-1" }]);
    mockOwnerLimit.mockResolvedValue([{ userId: "owner-user-1" }]);
    mockSync.mockResolvedValue({ synced: 2, created: 1, updated: 0, cancelled: 0, errors: [] });
  });

  it("401 when unauthenticated and does not sync", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(req(), PARAMS);
    expect(res.status).toBe(401);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("404 when the property is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mockPropertyLimit.mockResolvedValue([]);
    const res = await POST(req(), PARAMS);
    expect(res.status).toBe(404);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("lets the property owner sync", async () => {
    mockAuth.mockResolvedValue({ user: { id: "owner-user-1", role: "owner" } });
    const res = await POST(req(), PARAMS);
    expect(res.status).toBe(200);
    expect(mockSync).toHaveBeenCalledWith("prop-1");
    expect(await res.json()).toMatchObject({ synced: 2 });
  });

  it("403 for a cleaner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "cleaner-1", role: "cleaner" } });
    const res = await POST(req(), PARAMS);
    expect(res.status).toBe(403);
    expect(mockSync).not.toHaveBeenCalled();
  });

  it("403 for a different owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "someone-else", role: "owner" } });
    const res = await POST(req(), PARAMS);
    expect(res.status).toBe(403);
    expect(mockSync).not.toHaveBeenCalled();
  });
});
