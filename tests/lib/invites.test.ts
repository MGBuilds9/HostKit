import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist all mock fns
const {
  mockTxSelectForUpdate,
  mockTxSelect,
  mockTxUpdate,
  mockTxInsert,
  mockDbInsert,
} = vi.hoisted(() => ({
  mockTxSelectForUpdate: vi.fn(),
  mockTxSelect: vi.fn(),
  mockTxUpdate: vi.fn(),
  mockTxInsert: vi.fn(),
  mockDbInsert: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: mockDbInsert,
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: mockTxSelect,
        update: mockTxUpdate,
        insert: mockTxInsert,
      };
      return cb(tx);
    }),
  },
}));

// Mock drizzle-orm chainable helpers
vi.mock("drizzle-orm/pg-core", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return actual;
});

import { createInvite, claimInvite, inviteWouldDowngrade } from "@/lib/invites";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTxChain(returnValue: unknown[]) {
  const forMock = vi.fn().mockResolvedValue(returnValue);
  const whereMock = vi.fn(() => ({ for: forMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  return { forMock, whereMock, fromMock };
}

function makeUpdateChain(returnValue: unknown[]) {
  const returningMock = vi.fn().mockResolvedValue(returnValue);
  const whereMock = vi.fn(() => ({ returning: returningMock }));
  const setMock = vi.fn(() => ({ where: whereMock }));
  // tx.update() must return { set: setMock }
  const updateMock = { set: setMock };
  return { returningMock, whereMock, setMock, updateMock };
}

function makeInsertChain(returnValue: unknown[] = []) {
  const returningMock = vi.fn().mockResolvedValue(returnValue);
  const valuesMock = vi.fn(() => ({ returning: returningMock }));
  return { values: valuesMock, returningMock };
}

// Base fixture
const baseInvite = {
  id: "invite-1",
  email: "test@example.com",
  intendedRole: "owner" as const,
  propertyId: null as string | null,
  ownerId: "owner-1" as string | null,
  token: "tok-abc",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null as Date | null,
  acceptedByUserId: null as string | null,
  revokedAt: null as Date | null,
  invitedByUserId: "admin-1",
  createdAt: new Date(),
};

const baseUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "owner",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("createInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("lowercases the email before insert", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({ values: insertValues });

    await createInvite({
      email: "  Alice@EXAMPLE.COM  ",
      intendedRole: "manager",
      propertyId: "prop-1",
      invitedByUserId: "admin-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "alice@example.com" })
    );
  });

  it("returns a url containing the generated token", async () => {
    const { token, url } = await createInvite({
      email: "bob@example.com",
      intendedRole: "cleaner",
      invitedByUserId: "admin-1",
    });
    expect(token).toBeTruthy();
    expect(url).toContain(token);
    expect(url).toContain("/invite/");
  });

  it("generates unique tokens across calls", async () => {
    const results = await Promise.all([
      createInvite({ email: "a@b.com", intendedRole: "cleaner", invitedByUserId: "admin-1" }),
      createInvite({ email: "a@b.com", intendedRole: "cleaner", invitedByUserId: "admin-1" }),
    ]);
    expect(results[0].token).not.toBe(results[1].token);
  });

  it("stores propertyId and ownerId when provided", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    mockDbInsert.mockReturnValue({ values: insertValues });

    await createInvite({
      email: "owner@test.com",
      intendedRole: "owner",
      ownerId: "owner-42",
      invitedByUserId: "admin-1",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "owner-42" })
    );
  });
});

describe("inviteWouldDowngrade", () => {
  it("blocks admin and manager role changes, and established owner changes", () => {
    for (const target of ["owner", "manager", "cleaner"] as const) {
      expect(inviteWouldDowngrade("admin", target, false)).toBe(true);
    }
    expect(inviteWouldDowngrade("manager", "manager", false)).toBe(false);
    expect(inviteWouldDowngrade("manager", "owner", false)).toBe(true);
    expect(inviteWouldDowngrade("manager", "cleaner", false)).toBe(true);
    expect(inviteWouldDowngrade("owner", "cleaner", true)).toBe(true);
    expect(inviteWouldDowngrade("owner", "manager", true)).toBe(true);
    expect(inviteWouldDowngrade("owner", "owner", true)).toBe(false);
  });

  it("allows a provisional default owner to accept any invite role", () => {
    expect(inviteWouldDowngrade("owner", "cleaner", false)).toBe(false);
    expect(inviteWouldDowngrade("owner", "manager", false)).toBe(false);
    expect(inviteWouldDowngrade("owner", "owner", false)).toBe(false);
  });

  it("allows cleaner upgrades", () => {
    expect(inviteWouldDowngrade("cleaner", "owner", false)).toBe(false);
    expect(inviteWouldDowngrade("cleaner", "manager", false)).toBe(false);
    expect(inviteWouldDowngrade("cleaner", "cleaner", false)).toBe(false);
  });
});

function queueSelects(steps: Array<{ kind: "invite" | "user" | "limit"; rows: unknown[] }>) {
  const userFor = vi.fn();
  let n = 0;
  mockTxSelect.mockImplementation(() => {
    const step = steps[n++];
    if (!step) throw new Error(`unexpected select #${n}`);
    if (step.kind === "limit") {
      return { from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue(step.rows) }) }) };
    }
    const forFn = step.kind === "user" ? userFor : vi.fn();
    forFn.mockResolvedValue(step.rows);
    return { from: () => ({ where: () => ({ for: forFn }) }) };
  });
  return { userFor };
}

describe("claimInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxSelect.mockReset();
    mockTxUpdate.mockReset();
    mockTxInsert.mockReset();
  });

  it("returns not_found when invite does not exist", async () => {
    const { forMock } = makeTxChain([]);
    mockTxSelect.mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ for: forMock })) })) });

    const result = await claimInvite("bad-token", "user-1");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns revoked when invite.revokedAt is set", async () => {
    const invite = { ...baseInvite, revokedAt: new Date() };
    const inviteChain = makeTxChain([invite]);
    mockTxSelect
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ for: inviteChain.forMock })) })) })
      // user select (never reached but mock to be safe)
      .mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([baseUser])) })) });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "revoked" });
  });

  it("returns already_accepted when invite.acceptedAt is set", async () => {
    const invite = { ...baseInvite, acceptedAt: new Date() };
    const inviteChain = makeTxChain([invite]);
    mockTxSelect
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ for: inviteChain.forMock })) })) });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "already_accepted" });
  });

  it("returns expired when invite.expiresAt is in the past", async () => {
    const invite = { ...baseInvite, expiresAt: new Date(Date.now() - 1000) };
    const inviteChain = makeTxChain([invite]);
    mockTxSelect
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ for: inviteChain.forMock })) })) });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns email_mismatch and makes no writes when emails differ", async () => {
    const invite = { ...baseInvite, email: "alice@example.com" };
    const user = { ...baseUser, email: "bob@example.com" };
    const inviteChain = makeTxChain([invite]);
    // The claimInvite implementation does tx.select().from(invites)...for("update")
    // then tx.select().from(users)... (no .for()).
    // We mock two select calls in sequence.
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [user] },
    ]);

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "email_mismatch" });
    // No update/insert calls should have been made
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it("happy path: owner role claims owners row and sets role", async () => {
    const invite = { ...baseInvite, intendedRole: "owner" as const, ownerId: "owner-1" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
    ]);

    const ownersUpdate = makeUpdateChain([{ id: "owner-1", userId: "user-1" }]);
    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);

    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return ownersUpdate.updateMock; // owners claim
      if (updateCall === 2) return usersUpdate.updateMock;  // users role
      return invitesUpdate.updateMock;                       // invites mark accepted
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "owner", propertyId: null });
  });

  it("happy path: provisional owner accepts a manager invite", async () => {
    const invite = { ...baseInvite, intendedRole: "manager" as const, ownerId: null, propertyId: "prop-9" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
    ]);

    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);

    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "manager", propertyId: "prop-9" });
  });

  it("provisional owner accepts a cleaner invite and inserts a cleaners row", async () => {
    const invite = { ...baseInvite, intendedRole: "cleaner" as const, ownerId: null, propertyId: null };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
      { kind: "limit", rows: [] },
    ]);

    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);

    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    const insertChain = makeInsertChain([{ id: "cleaner-1" }]);
    mockTxInsert.mockReturnValue(insertChain);

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "cleaner", propertyId: null });
    expect(mockTxInsert).toHaveBeenCalled();
  });

  it("provisional owner cleaner claim skips insert when a cleaners row exists", async () => {
    const invite = { ...baseInvite, intendedRole: "cleaner" as const, ownerId: null };
    const existingCleaner = { id: "cleaner-1", userId: "user-1" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
      { kind: "limit", rows: [existingCleaner] },
    ]);

    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);

    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "cleaner", propertyId: null });
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it("returns owner_conflict when owners row is already claimed by another user", async () => {
    const invite = { ...baseInvite, intendedRole: "owner" as const, ownerId: "owner-1" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
      { kind: "limit", rows: [{ userId: "someone-else" }] },
    ]);

    // owners row update returns [] — no rows matched (already claimed)
    const ownersUpdate = makeUpdateChain([]);
    mockTxUpdate.mockReturnValue(ownersUpdate.updateMock);

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "owner_conflict" });
  });

  it("accepts an owner invite when the profile is already linked to this user", async () => {
    const invite = { ...baseInvite, intendedRole: "owner" as const, ownerId: "owner-1" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
      { kind: "limit", rows: [{ userId: "user-1" }] },
    ]);

    const ownersUpdate = makeUpdateChain([]);
    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([{ ...invite, acceptedAt: new Date() }]);
    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return ownersUpdate.updateMock;
      if (updateCall === 2) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "owner", propertyId: null });
    expect(invitesUpdate.updateMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ acceptedAt: expect.any(Date), acceptedByUserId: "user-1" })
    );
  });

  it("marks the invite as accepted on success (single-use)", async () => {
    const invite = { ...baseInvite, intendedRole: "owner" as const, ownerId: "owner-1" };
    const queued = queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [] },
    ]);

    const ownersUpdate = makeUpdateChain([{ id: "owner-1", userId: "user-1" }]);
    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([{ ...invite, acceptedAt: new Date() }]);

    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return ownersUpdate.updateMock;
      if (updateCall === 2) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    await claimInvite("tok-abc", "user-1");

    // The third update call is the invites update — confirm it sets acceptedAt
    expect(updateCall).toBe(3);
    expect(queued.userFor).toHaveBeenCalledWith("update");
    expect(invitesUpdate.updateMock.set).toHaveBeenCalledWith(
      expect.objectContaining({ acceptedAt: expect.any(Date), acceptedByUserId: "user-1" })
    );
  });

  it("returns not_found and writes nothing when the user row is missing", async () => {
    queueSelects([
      { kind: "invite", rows: [baseInvite] },
      { kind: "user", rows: [] },
    ]);

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "not_found" });
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("rejects an inactive user before any role write", async () => {
    const queued = queueSelects([
      { kind: "invite", rows: [{ ...baseInvite, intendedRole: "cleaner" as const }] },
      { kind: "user", rows: [{ ...baseUser, isActive: false }] },
    ]);

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: false, reason: "user_inactive" });
    expect(queued.userFor).toHaveBeenCalledWith("update");
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it("refuses to change an admin through any invite", async () => {
    for (const intendedRole of ["owner", "manager", "cleaner"] as const) {
      const queued = queueSelects([
        { kind: "invite", rows: [{ ...baseInvite, intendedRole, ownerId: "owner-1" }] },
        { kind: "user", rows: [{ ...baseUser, role: "admin" }] },
      ]);
      const result = await claimInvite("tok-abc", "user-1");
      expect(result).toEqual({ ok: false, reason: "role_protected" });
      expect(queued.userFor).toHaveBeenCalledWith("update");
    }
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("refuses to downgrade a manager", async () => {
    for (const intendedRole of ["owner", "cleaner"] as const) {
      queueSelects([
        { kind: "invite", rows: [{ ...baseInvite, intendedRole, ownerId: intendedRole === "owner" ? "owner-1" : null }] },
        { kind: "user", rows: [{ ...baseUser, role: "manager" }] },
      ]);
      const result = await claimInvite("tok-abc", "user-1");
      expect(result).toEqual({ ok: false, reason: "role_protected" });
    }
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it("allows a manager to accept another manager invite", async () => {
    const invite = { ...baseInvite, intendedRole: "manager" as const, ownerId: null, propertyId: "prop-9" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [{ ...baseUser, role: "manager" }] },
    ]);
    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);
    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      return updateCall === 1 ? usersUpdate.updateMock : invitesUpdate.updateMock;
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "manager", propertyId: "prop-9" });
  });

  it("refuses to move an established owner to cleaner or manager", async () => {
    for (const intendedRole of ["cleaner", "manager"] as const) {
      queueSelects([
        { kind: "invite", rows: [{ ...baseInvite, intendedRole, ownerId: null, propertyId: "prop-9" }] },
        { kind: "user", rows: [baseUser] },
        { kind: "limit", rows: [{ id: "linked-owner" }] },
      ]);
      const result = await claimInvite("tok-abc", "user-1");
      expect(result).toEqual({ ok: false, reason: "role_protected" });
    }
    expect(mockTxUpdate).not.toHaveBeenCalled();
    expect(mockTxInsert).not.toHaveBeenCalled();
  });

  it("lets an established owner claim a different unclaimed owner profile", async () => {
    const invite = { ...baseInvite, intendedRole: "owner" as const, ownerId: "owner-2" };
    queueSelects([
      { kind: "invite", rows: [invite] },
      { kind: "user", rows: [baseUser] },
      { kind: "limit", rows: [{ id: "already-linked" }] },
    ]);
    const ownersUpdate = makeUpdateChain([{ id: "owner-2", userId: "user-1" }]);
    const usersUpdate = makeUpdateChain([baseUser]);
    const invitesUpdate = makeUpdateChain([invite]);
    let updateCall = 0;
    mockTxUpdate.mockImplementation(() => {
      updateCall++;
      if (updateCall === 1) return ownersUpdate.updateMock;
      if (updateCall === 2) return usersUpdate.updateMock;
      return invitesUpdate.updateMock;
    });

    const result = await claimInvite("tok-abc", "user-1");
    expect(result).toEqual({ ok: true, role: "owner", propertyId: null });
    expect(updateCall).toBe(3);
  });
});
