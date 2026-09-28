import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock auth + db + turnover-generator at module boundaries.
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockCancelCleaningTasksForStay = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/turnover-generator", () => ({
  cancelCleaningTasksForStay: (...a: unknown[]) => mockCancelCleaningTasksForStay(...a),
}));

// Chainable update mock
const mockUpdateReturning = vi.fn();
const mockUpdateWhere = vi.fn((): { returning: typeof mockUpdateReturning } => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn((..._a: unknown[]): { where: typeof mockUpdateWhere } => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn((..._a: unknown[]): { set: typeof mockUpdateSet } => ({ set: mockUpdateSet }));

// Chainable delete mock
const mockDeleteWhere = vi.fn((..._a: unknown[]) => Promise.resolve(undefined));
const mockDelete = vi.fn((..._a: unknown[]): { where: typeof mockDeleteWhere } => ({ where: mockDeleteWhere }));

// Chainable select mock (used by DELETE's existence check)
const mockSelectLimit = vi.fn((..._a: unknown[]) => Promise.resolve([] as unknown[]));
const mockSelectWhere = vi.fn((..._a: unknown[]): { limit: typeof mockSelectLimit } => ({ limit: mockSelectLimit }));
const mockSelectFrom = vi.fn((..._a: unknown[]): { where: typeof mockSelectWhere } => ({ where: mockSelectWhere }));
const mockSelect = vi.fn((..._a: unknown[]): { from: typeof mockSelectFrom } => ({ from: mockSelectFrom }));

vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => mockSelect(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    query: {
      owners: { findFirst: vi.fn() },
      properties: { findFirst: vi.fn() },
    },
  },
}));

import {
  PATCH,
  DELETE,
} from "@/app/api/properties/[id]/stays/[stayId]/route";

const PARAMS = { params: { id: "prop-1", stayId: "stay-1" } };

function jsonReq(method: "PATCH" | "DELETE", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/properties/prop-1/stays/stay-1`, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const asRole = (role?: string) => (role ? { user: { id: "u1", role } } : null);

describe("PATCH /api/properties/[id]/stays/[stayId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateReturning.mockResolvedValue([{ id: "stay-1", isManual: true }]);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(jsonReq("PATCH", { guestName: "Jane" }), PARAMS);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("403 for owner and cleaner roles", async () => {
    for (const role of ["owner", "cleaner"]) {
      mockAuth.mockResolvedValue(asRole(role));
      const res = await PATCH(jsonReq("PATCH", { guestName: "Jane" }), PARAMS);
      expect(res.status).toBe(403);
    }
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("400 on invalid payload (bad status enum)", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await PATCH(jsonReq("PATCH", { status: "not-a-status" }), PARAMS);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 when the stay does not exist (no row returned)", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockUpdateReturning.mockResolvedValue([]);
    const res = await PATCH(jsonReq("PATCH", { guestName: "Jane" }), PARAMS);
    expect(res.status).toBe(404);
  });

  it("200 for admin and forces isManual=true on any edit", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await PATCH(
      jsonReq("PATCH", { guestName: "Jane Doe", status: "blocked" }),
      PARAMS
    );
    expect(res.status).toBe(200);
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as unknown as Record<string, unknown>;
    expect(setArg.isManual).toBe(true);
    expect(setArg.guestName).toBe("Jane Doe");
    expect(setArg.status).toBe("blocked");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  it("200 for manager as well", async () => {
    mockAuth.mockResolvedValue(asRole("manager"));
    const res = await PATCH(jsonReq("PATCH", { guestName: "Jane Doe" }), PARAMS);
    expect(res.status).toBe(200);
    expect(mockUpdateSet.mock.calls[0]?.[0]).toMatchObject({ isManual: true });
  });
});

describe("DELETE /api/properties/[id]/stays/[stayId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectLimit.mockResolvedValue([{ id: "stay-1" }]);
    mockDeleteWhere.mockResolvedValue(undefined);
  });

  it("401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(jsonReq("DELETE"), PARAMS);
    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("403 for manager (DELETE is admin-only)", async () => {
    mockAuth.mockResolvedValue(asRole("manager"));
    const res = await DELETE(jsonReq("DELETE"), PARAMS);
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("403 for owner", async () => {
    mockAuth.mockResolvedValue(asRole("owner"));
    const res = await DELETE(jsonReq("DELETE"), PARAMS);
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 when the stay does not exist under this property", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    mockSelectLimit.mockResolvedValue([]);
    const res = await DELETE(jsonReq("DELETE"), PARAMS);
    expect(res.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockCancelCleaningTasksForStay).not.toHaveBeenCalled();
  });

  it("200 for admin: deletes the stay and cancels its cleaning tasks", async () => {
    mockAuth.mockResolvedValue(asRole("admin"));
    const res = await DELETE(jsonReq("DELETE"), PARAMS);
    expect(res.status).toBe(200);
    expect(mockCancelCleaningTasksForStay).toHaveBeenCalledWith("stay-1");
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
