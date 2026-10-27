import { describe, expect, it } from "vitest";
import { stubHostAgentReply } from "@/lib/host-agent/client";

describe("host agent stub", () => {
  it("always leaves a non-safe draft for human review", () => {
    const reply = stubHostAgentReply({
      message: "Guest asked about parking",
      examples: [
        {
          threadId: "t1",
          title: "Parking",
          guestName: "Alex",
          labels: ["yes"],
          excerpt: "Yes — reserved spot 12.",
          score: 4,
          preferred: true,
        },
      ],
    });
    expect(reply.source).toBe("stub");
    expect(reply.draft?.isSafeTemplate).toBe(false);
    expect(reply.draft?.body).toMatch(/Mariam/);
    expect(reply.reply).toMatch(/locked/i);
  });
});
