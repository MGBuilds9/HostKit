import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth + db at module boundaries.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

// Programmable select queue: each queued entry is the rows array returned by
// .where() for one select() call, in call order. Falls back to mockSelectDefault.
const selectQueue: unknown[][] = [];
const mockSelectDefault = vi.fn(() => [] as unknown[]);
const mockSelectWhere = vi.fn(() => {
  const next = selectQueue.length > 0 ? selectQueue.shift()! : mockSelectDefault();
  return Promise.resolve(next);
});
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn((..._a: unknown[]) => ({ from: mockSelectFrom }));

const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn((): { where: typeof mockUpdateWhere } => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((..._a: unknown[]) => ({ set: mockUpdateSet }));

const mockDeleteReturning = vi.fn();
const mockDeleteWhere = vi.fn(() => ({ returning: mockDeleteReturning }));
const mockDelete = vi.fn((..._a: unknown[]) => ({ where: mockDeleteWhere }));

vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => mockSelect(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
  },
}));

import { PATCH, DELETE } from "@/app/api/users/[id]/route";
import { PATCH as rolePATCH } from "@/app/api/users/[id]/role/route";

const PARAMS = { params: { id: "target-user" } };
const ADMIN = { user: { id: "admin-1", role: "admin" } };
const TARGET_USER = {
  id: "target-user",
  name: "Old Name",
  email: "old@example.com",
  role: "owner",
  isActive: true,
};

function req(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/users/target-user", {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const asRole = (role?: string) => (role ? { user: { id: "u1", role } } : null);

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    mockSelectDefault.mockReturnValue([]);
    mockUpdateReturning.mockResolvedValue([{ ...TARGET_USER, name: "New Name" }]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(req("PATCH", { name: "X" }), PARAMS);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("403 for non-admin roles", async () => {
    for (const role of ["owner", "manager", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await PATCH(req("PATCH", { name: "X" }), PARAMS);
      expect(res.status).toBe(403);
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 on invalid email", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await PATCH(req("PATCH", { email: "not-an-email" }), PARAMS);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.fieldErrors.email).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 when admin tries to change their own role", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await PATCH(
      req("PATCH", { role: "owner" }),
      { params: { id: "admin-1" } }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot change your own role/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 when admin tries to deactivate their own account", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await PATCH(
      req("PATCH", { isActive: false }),
      { params: { id: "admin-1" } }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot deactivate your own account/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 when demoting the last active admin", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    // select 1: target user lookup → currently admin; select 2: other admins → none
    selectQueue.push([{ ...TARGET_USER, role: "admin", isActive: true }], []);
    const res = await PATCH(req("PATCH", { role: "owner" }), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot remove the last admin/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("409 when deactivating the last active admin", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    selectQueue.push([{ ...TARGET_USER, role: "admin", isActive: true }], []);
    const res = await PATCH(req("PATCH", { isActive: false }), PARAMS);
    expect(res.status).toBe(409);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 when user does not exist", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUpdateReturning.mockResolvedValue([]);
    const res = await PATCH(req("PATCH", { name: "Nobody" }), PARAMS);
    expect(res.status).toBe(404);
  });

  it("200 on success editing name/email, sets updatedAt", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await PATCH(
      req("PATCH", { name: "New Name", email: "new@example.com" }),
      PARAMS
    );
    expect(res.status).toBe(200);
    expect(mockSelect).not.toHaveBeenCalled();
    const setArg = (mockUpdateSet.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(setArg.name).toBe("New Name");
    expect(setArg.email).toBe("new@example.com");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("200 demoting an admin when another active admin exists", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    // target is admin, but one other active admin remains
    selectQueue.push(
      [{ ...TARGET_USER, role: "admin", isActive: true }],
      [{ id: "admin-2", role: "admin", isActive: true }]
    );
    mockUpdateReturning.mockResolvedValue([{ ...TARGET_USER, role: "owner" }]);
    const res = await PATCH(req("PATCH", { role: "owner" }), PARAMS);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    mockSelectDefault.mockReturnValue([]);
    mockDeleteReturning.mockResolvedValue([TARGET_USER]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("403 for non-admin roles", async () => {
    for (const role of ["owner", "manager", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await DELETE(req("DELETE"), PARAMS);
      expect(res.status).toBe(403);
    }
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("400 when admin tries to delete their own account", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await DELETE(req("DELETE"), { params: { id: "admin-1" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot delete your own account/);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("409 when deleting the last active admin", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    // target is admin; no other active admins
    selectQueue.push([{ ...TARGET_USER, role: "admin", isActive: true }], []);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot remove the last admin/);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("409 when user has linked owner records", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    // target lookup (non-admin), then owners lookup finds a row
    selectQueue.push([TARGET_USER], [{ id: "owner-1", userId: "target-user" }]);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/linked owner records/);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 when user does not exist", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockDeleteReturning.mockResolvedValue([]);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(404);
  });

  it("200 on success (non-admin target, no linked owners)", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    // target lookup (non-admin), owners lookup empty
    selectQueue.push([TARGET_USER], []);
    const res = await DELETE(req("DELETE"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("target-user");
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/users/[id]/role (existing route, last-admin guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue.length = 0;
    mockSelectDefault.mockReturnValue([]);
    mockUpdateReturning.mockResolvedValue([{ ...TARGET_USER, role: "owner" }]);
  });

  it("409 when demoting the last active admin via role route", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    selectQueue.push([{ ...TARGET_USER, role: "admin", isActive: true }], []);
    const res = await rolePATCH(req("PATCH", { role: "owner" }), PARAMS);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot remove the last admin/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("200 promotion to admin never triggers the guard", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await rolePATCH(req("PATCH", { role: "admin" }), PARAMS);
    expect(res.status).toBe(200);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("400 self role change still blocked before guard", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    const res = await rolePATCH(
      req("PATCH", { role: "owner" }),
      { params: { id: "admin-1" } }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Cannot change your own role/);
  });

  it("200 demoting an admin when another admin exists", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    selectQueue.push(
      [{ ...TARGET_USER, role: "admin", isActive: true }],
      [{ id: "admin-2", role: "admin", isActive: true }]
    );
    const res = await rolePATCH(req("PATCH", { role: "owner" }), PARAMS);
    expect(res.status).toBe(200);
  });
});
