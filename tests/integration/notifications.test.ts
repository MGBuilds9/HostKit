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

import { notifyTaskAssigned, notifyTaskUpdated, notifyTaskCancelled, formatTaskDate } from "@/lib/notifications";

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
