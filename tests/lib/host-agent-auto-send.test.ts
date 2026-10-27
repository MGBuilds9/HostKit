import { describe, expect, it } from "vitest";
import {
  autoSendIfAllowed,
  canAutoSend,
  canManualSend,
  getApproverLockState,
  isSmarterAutoSendUnlocked,
} from "@/lib/host-agent/auto-send";

describe("approver lock", () => {
  it("defaults smarter auto-send to locked", () => {
    expect(isSmarterAutoSendUnlocked({})).toBe(false);
    expect(getApproverLockState({}).locked).toBe(true);
  });

  it("only unlocks when the env flag is the string true", () => {
    expect(isSmarterAutoSendUnlocked({ HOST_AGENT_SMARTER_AUTO_SEND: "true" })).toBe(true);
    expect(isSmarterAutoSendUnlocked({ HOST_AGENT_SMARTER_AUTO_SEND: "1" })).toBe(false);
  });

  it("never auto-sends chat drafts, even if the unlock flag is on", () => {
    expect(canAutoSend({ isSafeTemplate: false })).toBe(false);
    expect(autoSendIfAllowed({ isSafeTemplate: false })).toBeNull();
  });

  it("allows the automatic path only for safe templates", () => {
    const result = autoSendIfAllowed({ isSafeTemplate: true });
    expect(result?.dryRun).toBe(true);
    expect(result?.note).toMatch(/not wired/i);
  });

  it("gates manual send to approved or safe-template drafts", () => {
    expect(canManualSend({ isSafeTemplate: false, status: "pending" })).toBe(false);
    expect(canManualSend({ isSafeTemplate: false, status: "approved" })).toBe(true);
    expect(canManualSend({ isSafeTemplate: true, status: "pending" })).toBe(true);
    expect(canManualSend({ isSafeTemplate: true, status: "sent" })).toBe(false);
    expect(canManualSend({ isSafeTemplate: false, status: "rejected" })).toBe(false);
  });
});
