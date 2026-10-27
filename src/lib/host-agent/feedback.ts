import type { ExampleLabel } from "./retrieve";

export type DraftFeedbackAction = "approved" | "edited" | "rejected" | "sent";

export function outcomeToLabel(action: DraftFeedbackAction): ExampleLabel | null {
  if (action === "approved") return "yes";
  if (action === "rejected") return "no";
  return null;
}

export function labelsAfterOutcome(
  current: ExampleLabel[],
  action: DraftFeedbackAction
): ExampleLabel[] {
  const next = new Set(current);
  if (action === "approved") {
    next.delete("no");
    next.add("yes");
  } else if (action === "rejected") {
    next.delete("yes");
    next.add("no");
  }
  return Array.from(next);
}

export function isReviewAction(action: string): action is DraftFeedbackAction {
  return action === "approved" || action === "edited" || action === "rejected" || action === "sent";
}
