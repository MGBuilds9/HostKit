import { describe, expect, it } from "vitest";
import { labelsAfterOutcome, outcomeToLabel } from "@/lib/host-agent/feedback";

describe("draft feedback loop", () => {
  it("maps approve/reject onto yes/no labels", () => {
    expect(outcomeToLabel("approved")).toBe("yes");
    expect(outcomeToLabel("rejected")).toBe("no");
    expect(outcomeToLabel("edited")).toBeNull();
    expect(outcomeToLabel("sent")).toBeNull();
  });

  it("flips opposite yes/no labels and keeps process tags", () => {
    expect(labelsAfterOutcome(["no", "screening"], "approved")).toEqual(["screening", "yes"]);
    expect(labelsAfterOutcome(["yes", "stay"], "rejected")).toEqual(["stay", "no"]);
    expect(labelsAfterOutcome(["screening"], "edited")).toEqual(["screening"]);
  });
});
