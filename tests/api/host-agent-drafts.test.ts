import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/host-agent/memory", () => ({
  recordDraftEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      hostDrafts: { findMany: vi.fn(), findFirst: vi.fn() },
      messageTemplates: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/host-agent/drafts/route";
import { PATCH } from "@/app/api/host-agent/drafts/[id]/route";
import { auth } from "@/lib/auth";
import { db } from "@/db";

const mockAuth = auth as ReturnType<typeof vi.fn>;

function jsonRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

describe("host-agent drafts API authz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for owner and cleaner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "owner" } });
    expect((await GET()).status).toBe(403);
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "cleaner" } });
    expect((await GET()).status).toBe(403);
  });

  it("lists drafts for admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    (db.query.hostDrafts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("lists drafts for manager", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "manager" } });
    (db.query.hostDrafts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });
});

describe("host-agent draft create/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
  });

  it("creates a pending chat draft and does not auto-send", async () => {
    const created = {
      id: "d1",
      body: "Hello guest",
      isSafeTemplate: false,
      status: "pending",
      threadId: null,
    };
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    });

    const res = await POST(
      jsonRequest("http://localhost/api/host-agent/drafts", "POST", {
        title: "Reply",
        body: "Hello guest",
        source: "chat",
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.status).toBe("pending");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("blocks send on a pending non-template draft", async () => {
    (db.query.hostDrafts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "d1",
      status: "pending",
      isSafeTemplate: false,
      body: "Hi",
      threadId: null,
    });
    const res = await PATCH(
      jsonRequest("http://localhost/api/host-agent/drafts/d1", "PATCH", { action: "send" }),
      { params: { id: "d1" } }
    );
    expect(res.status).toBe(409);
  });
});
