import { describe, expect, it } from "vitest";
import { applyDefaultLabels, parseArchiveInput } from "@/lib/host-agent/ingest";

describe("archive ingest parser", () => {
  it("parses a JSON thread list", () => {
    const threads = parseArchiveInput(JSON.stringify({
      threads: [
        {
          title: "Screening — May",
          guestName: "Sam",
          labels: ["yes", "screening"],
          messages: [
            { role: "guest", body: "How many guests can stay?" },
            { role: "host", body: "The listing sleeps 6." },
          ],
        },
      ],
    }));
    expect(threads).toHaveLength(1);
    expect(threads[0].title).toBe("Screening — May");
    expect(threads[0].labels).toEqual(["yes", "screening"]);
    expect(threads[0].messages).toHaveLength(2);
  });

  it("parses Guest:/Host: paste with a header", () => {
    const threads = parseArchiveInput(
      "# Parking\nGuest: Is parking included?\nHost: Yes, spot 12.\n\n# Wifi\nGuest: Password?\nMariam: It is on the guide."
    );
    expect(threads).toHaveLength(2);
    expect(threads[0].title).toBe("Parking");
    expect(threads[1].messages[1].role).toBe("host");
  });

  it("returns empty for blank input", () => {
    expect(parseArchiveInput("   ")).toEqual([]);
  });

  it("applies default labels without dropping thread labels", () => {
    const [thread] = applyDefaultLabels(
      [{ title: "T", labels: ["yes"], messages: [{ role: "guest", body: "hi" }] }],
      ["stay"]
    );
    expect(thread.labels).toEqual(["yes", "stay"]);
  });
});
