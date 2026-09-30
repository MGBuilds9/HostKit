import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSignInEmailHtml,
  decideEmailSignIn,
  emailSignInGate,
  resetEmailLinkSlots,
  shouldAutoPromoteToAdmin,
  takeEmailLinkSlot,
} from "@/lib/email-signin";

describe("decideEmailSignIn", () => {
  it("allows an active account back in", () => {
    expect(
      decideEmailSignIn({ user: { isActive: true }, hasPendingInvite: false })
    ).toBe(true);
  });

  it("rejects a deactivated account even when an invite is open", () => {
    expect(
      decideEmailSignIn({ user: { isActive: false }, hasPendingInvite: true })
    ).toBe(false);
  });

  it("allows a new address only while an invite is pending", () => {
    expect(decideEmailSignIn({ user: null, hasPendingInvite: true })).toBe(true);
    expect(decideEmailSignIn({ user: null, hasPendingInvite: false })).toBe(false);
  });
});

describe("shouldAutoPromoteToAdmin", () => {
  it("promotes the first account when nothing is waiting to claim", () => {
    expect(shouldAutoPromoteToAdmin(1, false)).toBe(true);
  });

  it("leaves an invited first account for the invite to assign", () => {
    expect(shouldAutoPromoteToAdmin(1, true)).toBe(false);
    expect(shouldAutoPromoteToAdmin(3, false)).toBe(false);
  });
});

describe("takeEmailLinkSlot", () => {
  beforeEach(() => {
    resetEmailLinkSlots();
  });

  it("allows five links to one address inside the window", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(takeEmailLinkSlot("mariam@live.ca", now + i)).toBe(true);
    }
    expect(takeEmailLinkSlot("mariam@live.ca", now + 6)).toBe(false);
    expect(takeEmailLinkSlot("other@live.ca", now + 6)).toBe(true);
  });
});

describe("emailSignInGate", () => {
  it("stops before any lookup when email sending is not configured", async () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      await expect(emailSignInGate("person@live.ca")).resolves.toBe(
        "/login?error=EmailNotConfigured"
      );
    } finally {
      if (previous === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = previous;
    }
  });
});

describe("buildSignInEmailHtml", () => {
  it("puts the link in the button and escapes markup in the address", () => {
    const html = buildSignInEmailHtml(
      "https://hostkit.mkgbuilds.com/api/auth/callback/resend?token=abc&email=a@b.ca"
    );
    expect(html).toContain("https://hostkit.mkgbuilds.com/api/auth/callback/resend?token=abc&amp;email=a@b.ca");
    expect(html).not.toContain("<script");
  });
});
