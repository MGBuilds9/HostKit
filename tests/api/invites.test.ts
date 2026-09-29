import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Hoist mocks
const {
  mockAuth,
  mockFindMany,
  mockFindFirst,
  mockInsert,
  mockUpdate,
  mockSelect,
  mockSendInviteEmail,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindFirst: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockSendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

vi.mock("@/lib/notifications", () => ({
  sendInviteEmail: (...a: unknown[]) => mockSendInviteEmail(...a),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      invites: { findMany: mockFindMany, findFirst: mockFindFirst },
      properties: { findFirst: mockFindFirst },
      owners: { findFirst: mockFindFirst },
    },
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  },
}));

import { GET, POST } from "@/app/api/admin/invites/route";
import { POST as POST_REVOKE } from "@/app/api/admin/invites/[id]/revoke/route";
import { POST as POST_RESEND } from "@/app/api/admin/invites/[id]/resend/route";

const asRole = (role?: string) =>
  role ? { user: { id: "admin-1", role, email: "admin@test.com" } } : null;

function makeRequest(opts?: {
  method?: string;
  body?: unknown;
  url?: string;
}) {
  return new NextRequest(opts?.url ?? "http://localhost/api/admin/invites", {
    method: opts?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
}

const params = { params: { id: "invite-1" } };

// ── GET /api/admin/invites ───────────────────────────────────────────────────

describe("GET /api/admin/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin roles", async () => {
    for (const role of ["owner", "manager", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
    }
  });

  it("returns invite list for admin", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const mockInvites = [
      { id: "i1", email: "a@b.com", intendedRole: "cleaner" },
    ];
    mockFindMany.mockResolvedValue(mockInvites);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockInvites);
  });

  it("strips the bearer token from the list", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockFindMany.mockResolvedValue([
      { id: "i1", email: "a@b.com", intendedRole: "owner", token: "secret-token" },
    ]);
    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json[0].token).toBeUndefined();
    expect(json[0].email).toBe("a@b.com");
    expect(JSON.stringify(json)).not.toContain("secret-token");
  });

  it("passes a filter when both propertyId and ownerId are queried", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockFindMany.mockResolvedValue([]);
    const res = await GET(makeRequest({
      url: "http://localhost/api/admin/invites?propertyId=prop-1&ownerId=owner-1",
    }));
    expect(res.status).toBe(200);
    const arg = mockFindMany.mock.calls[0][0] as { where?: unknown };
    expect(arg.where).toBeDefined();
  });
});

// ── POST /api/admin/invites ──────────────────────────────────────────────────

describe("POST /api/admin/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest({ method: "POST", body: {} }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin roles", async () => {
    for (const role of ["owner", "manager", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await POST(makeRequest({ method: "POST", body: {} }));
      expect(res.status).toBe(403);
    }
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(makeRequest({ method: "POST", body: { email: "not-an-email" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when manager invite lacks propertyId", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { email: "m@test.com", intendedRole: "manager" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when owner invite lacks ownerId and ownerName", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { email: "o@test.com", intendedRole: "owner" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 201 and calls sendInviteEmail for cleaner invite", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { email: "cleaner@test.com", intendedRole: "cleaner" },
      })
    );
    expect(res.status).toBe(201);
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      "cleaner@test.com",
      expect.stringContaining("/invite/"),
      "cleaner",
      undefined
    );
  });

  it("returns 201 for owner invite with ownerName (creates owners row)", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockInsert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "owner-new" }]),
      })),
    });

    const res = await POST(
      makeRequest({
        method: "POST",
        body: {
          email: "owner@test.com",
          intendedRole: "owner",
          ownerName: "John Owner",
        },
      })
    );
    expect(res.status).toBe(201);
    expect(mockSendInviteEmail).toHaveBeenCalled();
  });

  it("returns 201 for manager invite with valid propertyId", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockFindFirst.mockResolvedValue({ name: "Beach House" });

    const res = await POST(
      makeRequest({
        method: "POST",
        body: {
          email: "manager@test.com",
          intendedRole: "manager",
          propertyId: "123e4567-e89b-12d3-a456-426614174000",
        },
      })
    );
    expect(res.status).toBe(201);
  });

  it("returns 400 when the supplied ownerId does not exist", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockFindFirst.mockResolvedValue(undefined);
    const res = await POST(
      makeRequest({
        method: "POST",
        body: {
          email: "owner@test.com",
          intendedRole: "owner",
          ownerId: "123e4567-e89b-12d3-a456-426614174000",
        },
      })
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Owner not found" });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendInviteEmail).not.toHaveBeenCalled();
  });

  it("reuses an existing owner row with the same email instead of inserting another", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockFindFirst.mockResolvedValueOnce({ id: "owner-existing", email: "owner@test.com" });
    const res = await POST(
      makeRequest({
        method: "POST",
        body: {
          email: "owner@test.com",
          intendedRole: "owner",
          ownerName: "Owner Person",
        },
      })
    );
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0];
    expect(inserted).toBeDefined();
    expect(mockSendInviteEmail).toHaveBeenCalled();
  });
});

// ── POST /api/admin/invites/[id]/revoke ─────────────────────────────────────

describe("POST /api/admin/invites/[id]/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST_REVOKE(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(asRole("owner"));
    const res = await POST_REVOKE(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 when invite not found", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([]) })),
      })),
    });
    const res = await POST_REVOKE(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(404);
  });

  it("returns success when invite is revoked", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockUpdate.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: "invite-1" }]),
        })),
      })),
    });
    const res = await POST_REVOKE(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ── POST /api/admin/invites/[id]/resend ─────────────────────────────────────

describe("POST /api/admin/invites/[id]/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseInvite = {
    id: "invite-1",
    email: "invitee@test.com",
    intendedRole: "cleaner",
    propertyId: null,
    token: "tok-xyz",
    acceptedAt: null,
    revokedAt: null,
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue(asRole("owner"));
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 when invite not found", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    });
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 409 when already accepted", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ ...baseInvite, acceptedAt: new Date() }]),
      })),
    });
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(409);
  });

  it("returns 409 when revoked", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ ...baseInvite, revokedAt: new Date() }]),
      })),
    });
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(409);
  });

  it("returns success and calls sendInviteEmail on resend", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([baseInvite]),
      })),
    });
    const res = await POST_RESEND(makeRequest({ method: "POST" }), params);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSendInviteEmail).toHaveBeenCalledWith(
      "invitee@test.com",
      expect.stringContaining("/invite/"),
      "cleaner",
      undefined
    );
  });
});
