import { describe, expect, it } from "vitest";
import {
  formatExamplesForPrompt,
  retrieveExamples,
  scoreExample,
  type RetrievableExample,
} from "@/lib/host-agent/retrieve";

const parkingYes: RetrievableExample = {
  threadId: "t-yes",
  title: "Parking included?",
  guestName: "Alex",
  labels: ["yes", "screening"],
  messages: [
    { role: "guest", body: "Is parking included with the stay?" },
    { role: "host", body: "Yes — reserved spot 12 in the underground garage." },
  ],
  outcomes: ["approved"],
};

const wifiNo: RetrievableExample = {
  threadId: "t-no",
  title: "Wifi password too casual",
  labels: ["no"],
  messages: [
    { role: "guest", body: "What is the wifi password?" },
    { role: "host", body: "lol just guess it" },
  ],
  outcomes: ["rejected"],
};

describe("playbook retrieval", () => {
  it("prefers yes/approved examples over no/rejected for the same topic", () => {
    const yesScore = scoreExample("is parking included for my stay", parkingYes);
    const noScore = scoreExample("is parking included for my stay", wifiNo);
    expect(yesScore).toBeGreaterThan(noScore);
  });

  it("returns preferred matches and skips zero-score noise", () => {
    const results = retrieveExamples("parking garage spot", [parkingYes, wifiNo]);
    expect(results[0]?.threadId).toBe("t-yes");
    expect(results[0]?.preferred).toBe(true);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  it("formats an empty playbook as a human-review reminder", () => {
    expect(formatExamplesForPrompt([])).toMatch(/human review/i);
  });
});
