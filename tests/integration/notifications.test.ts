import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock fns so they're available inside vi.mock factories
const { mockInsert, mockFindFirst, mockFindMany } = vi.hoisted(() => {
  const mockInsert = vi.fn();
  const mockFindFirst = vi.fn();
  const mockFindMany = vi.fn();
  return { mockInsert, mockFindFirst, mockFindMany };
});

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-1" }),
    },
  })),
}));

vi.mock("@/lib/push", () => ({
  sendPushToSubscriptions: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: {
    query: {
      cleaningTasks: { findFirst: mockFindFirst },
      cleaners: { findFirst: mockFindFirst },
      pushSubscriptions: { findMany: mockFindMany },
    },
    insert: mockInsert,
  },
}));

import {
  notifyTaskAssigned,
  notifyTaskUpdated,
  notifyTaskCancelled,
  formatTaskDate,
  buildInviteEmailHtml,
  sendInviteEmail,
} from "@/lib/notifications";

function buildMockTask(overrides?: Partial<{ emailEnabled: boolean; pushEnabled: boolean }>) {
  return {
    id: "task-1",
    status: "pending",
    scheduledStart: new Date("2026-06-01T10:00:00Z"),
    scheduledEnd: new Date("2026-06-01T13:00:00Z"),
    assignedCleaner: {
      id: "cleaner-1",
      email: "cleaner@test.com",
      userId: "user-cleaner-1",
      notificationPreferences: {
        emailEnabled: overrides?.emailEnabled ?? true,
        pushEnabled: overrides?.pushEnabled ?? false,
      },
    },
    property: {
      name: "Beach House",
      addressStreet: "123 Ocean Drive",
    },
    stay: { guestName: "Alice" },
  };
}

describe("notifyTaskAssigned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockFindMany.mockResolvedValue([]);
  });

  it("inserts a notification record in DB", async () => {
    mockFindFirst.mockResolvedValue(buildMockTask());

    await notifyTaskAssigned("task-1");

    expect(mockInsert).toHaveBeenCalled();
  });

  it("skips email when emailEnabled is false (does not throw)", async () => {
    const taskWithEmailDisabled = {
      ...buildMockTask(),
      assignedCleaner: {
        ...buildMockTask().assignedCleaner,
        notificationPreferences: { emailEnabled: false, pushEnabled: false },
      },
    };
    mockFindFirst.mockResolvedValue(taskWithEmailDisabled);

    // Should complete without error even when email is disabled
    await expect(notifyTaskAssigned("task-1")).resolves.toBeUndefined();
    // DB notification still inserted (email disabled doesn't skip the DB record)
    expect(mockInsert).toHaveBeenCalled();
  });

  it("does nothing when task has no assigned cleaner", async () => {
    mockFindFirst.mockResolvedValue({
      ...buildMockTask(),
      assignedCleaner: null,
    });

    await expect(notifyTaskAssigned("task-1")).resolves.toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("does nothing when task is not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(notifyTaskAssigned("task-1")).resolves.toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe("notifyTaskUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockFindMany.mockResolvedValue([]);
  });

  it("inserts a task_updated notification", async () => {
    mockFindFirst.mockResolvedValue(buildMockTask());

    await notifyTaskUpdated("task-1");

    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("notifyTaskCancelled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockFindMany.mockResolvedValue([]);
  });

  it("inserts a task_cancelled notification", async () => {
    mockFindFirst.mockResolvedValue(buildMockTask());

    await notifyTaskCancelled("task-1");

    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("formatTaskDate", () => {
  it("returns a non-empty string for a valid date", () => {
    const result = formatTaskDate(new Date("2026-06-01T14:00:00Z"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("invite email", () => {
  it("escapes property names and the invite URL in HTML", () => {
    const html = buildInviteEmailHtml(
      "https://hostkit.example/invite/tok?x=1&y=2",
      "owner",
      'Beach <script>"house"'
    );
    expect(html).toContain("Beach &lt;script&gt;&quot;house&quot;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("https://hostkit.example/invite/tok?x=1&amp;y=2");
    expect(html).toContain(">Owner<");
  });

  it("does not log the invite URL when Resend is not configured", async () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    try {
      await sendInviteEmail(
        "person@example.com",
        "https://hostkit.example/invite/secret-token",
        "manager",
        "Kith 1423"
      );
      const logged = info.mock.calls.flat().join(" ");
      expect(logged).toContain("RESEND_API_KEY is not set");
      expect(logged).not.toContain("secret-token");
      expect(logged).not.toContain("person@example.com");
    } finally {
      info.mockRestore();
      if (previous === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previous;
    }
  });
});
