/**
 * Approver lock + the only automatic-send path HostKit allows (KITH-2).
 *
 * Smarter auto-send stays OFF unless HOST_AGENT_SMARTER_AUTO_SEND=true.
 * Even then this module does not fire smarter auto-send — that path is not
 * implemented. The only automatic send that may run is a pre-approved
 * safe template draft (isSafeTemplate).
 */

export type AutoSendDraft = {
  isSafeTemplate: boolean;
  status?: "pending" | "approved" | "sent" | "rejected";
};

type EnvLike = Record<string, string | undefined>;

export function isSmarterAutoSendUnlocked(
  env: EnvLike = process.env
): boolean {
  return env.HOST_AGENT_SMARTER_AUTO_SEND === "true";
}

export function getApproverLockState(env: EnvLike = process.env) {
  const smarterUnlocked = isSmarterAutoSendUnlocked(env);
  return {
    smarterUnlocked,
    locked: !smarterUnlocked,
    explanation: smarterUnlocked
      ? "Smarter auto-send unlock is set. Chat drafts still need a human Approve/Send — only safe Approved templates auto-send."
      : "Smarter auto-send is locked. Only drafts from a pre-approved safe template may auto-send. Everything else stays a draft for Approve / Edit / Reject.",
  };
}

/** True only for pre-approved safe-template drafts. Chat drafts never auto-send. */
export function canAutoSend(draft: AutoSendDraft): boolean {
  return draft.isSafeTemplate === true;
}

export function canManualSend(draft: AutoSendDraft): boolean {
  if (draft.status === "sent" || draft.status === "rejected") return false;
  return draft.status === "approved" || draft.isSafeTemplate;
}

export type DryRunSendResult = {
  sent: true;
  dryRun: true;
  note: string;
  sentAt: Date;
};

export function dryRunSend(): DryRunSendResult {
  return {
    sent: true,
    dryRun: true,
    note: "Dry-run: Airbnb Messaging is not wired yet. Draft marked sent locally only.",
    sentAt: new Date(),
  };
}

/**
 * Single automatic-send entry point. Returns null when the lock forbids it.
 * Callers must not invent a second path around this.
 */
export function autoSendIfAllowed(draft: AutoSendDraft): DryRunSendResult | null {
  if (!canAutoSend(draft)) return null;
  return dryRunSend();
}
