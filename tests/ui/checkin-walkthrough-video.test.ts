import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  resolveInitialPlaybackRate,
  formatVideoTime,
} from "@/components/guest/checkin-walkthrough";
import { propertyAccessSchema } from "@/lib/validators";

describe("guest guide video scrubbing & playback speed", () => {
  it("defaults garage-to-elevator video to 0.25x even when DB step omits playbackRate", () => {
    expect(
      resolveInitialPlaybackRate({
        mediaUrl: "/guide-media/kith-1423/assets/garage-to-elevator.mp4",
      }),
    ).toBe(0.25);
  });

  it("honors explicit step playbackRate and falls back to 1x for normal clips", () => {
    expect(
      resolveInitialPlaybackRate({
        mediaUrl: "/guide-media/kith-1423/assets/arrival-drive.mp4",
        playbackRate: 0.5,
      }),
    ).toBe(0.5);

    expect(
      resolveInitialPlaybackRate({
        mediaUrl: "/guide-media/kith-1423/assets/arrival-drive.mp4",
      }),
    ).toBe(1);
  });

  it("formats video scrubber timestamps cleanly", () => {
    expect(formatVideoTime(0)).toBe("0:00");
    expect(formatVideoTime(11.53)).toBe("0:11");
    expect(formatVideoTime(102.15)).toBe("1:42");
    expect(formatVideoTime(Number.NaN)).toBe("0:00");
  });

  it("validates playbackRate and tolerates empty-string admin form fields in propertyAccessSchema", () => {
    const parsed = propertyAccessSchema.parse({
      checkinSteps: [
        {
          step: 1,
          title: "Say hello before arrival",
          description: "Call or text host",
          icon: "",
          mediaUrl: "",
          mediaType: "",
          posterUrl: "",
        },
        {
          step: 6,
          title: "Spot 257 to elevator & up to 14th floor",
          description: "Walk to elevator",
          mediaUrl: "/guide-media/kith-1423/assets/garage-to-elevator.mp4",
          mediaType: "video",
          playbackRate: 0.25,
        },
      ],
    });
    expect(parsed.checkinSteps?.[0]?.mediaType).toBe("");
    expect(parsed.checkinSteps?.[1]?.playbackRate).toBe(0.25);
  });

  it("renders range scrubber, touch/pointer double-fire guard, and speed controls in checkin-walkthrough.tsx", () => {
    const src = readFileSync(
      resolve(__dirname, "../../src/components/guest/checkin-walkthrough.tsx"),
      "utf-8",
    );
    expect(src).toContain('type="range"');
    expect(src).toContain("if (scrubbingRef.current) return;");
    expect(src).toContain("onLostPointerCapture={handleScrubEnd}");
    expect(src).toContain("Scrub ${step.title} video timeline");
    expect(src).toContain('aria-label="Playback speed"');
    expect(src).toContain("el.defaultPlaybackRate =");
  });

  it("keeps Kith 1423 arrival steps & in-stay video guides aligned across seed, SQL, and page", () => {
    const seedSrc = readFileSync(
      resolve(__dirname, "../../src/db/seed.ts"),
      "utf-8",
    );
    const sqlSrc = readFileSync(
      resolve(__dirname, "../../drizzle/manual/2026-11-03_kith_1423_guide_steps.sql"),
      "utf-8",
    );
    const pageSrc = readFileSync(
      resolve(__dirname, "../../src/app/g/[slug]/page.tsx"),
      "utf-8",
    );

    for (const content of [seedSrc, sqlSrc]) {
      expect(content).toContain("go down two more ramps to Level P3 and park in Spot 257");
      expect(content).toContain("/guide-media/kith-1423/assets/keys-and-fob.jpg");
      expect(content).toContain("/guide-media/kith-1423/assets/parking-arrow.jpg");
      expect(content).toContain("/guide-media/kith-1423/assets/garage-to-elevator.mp4");
      expect(content).toContain("{{property.guestAccessCode}}");
    }

    // Ensure UPDATE message_templates does not reference non-existent updated_at column
    const templateUpdateBlock = sqlSrc.split("UPDATE message_templates")[1] ?? "";
    expect(templateUpdateBlock).not.toContain("updated_at");

    const jsonMatch = sqlSrc.match(/\$json\$([\s\S]*?)\$json\$/);
    expect(jsonMatch).not.toBeNull();
    const sqlSteps = JSON.parse(jsonMatch![1]);
    const validated = propertyAccessSchema.parse({ checkinSteps: sqlSteps });
    expect(validated.checkinSteps).toHaveLength(6);
    expect(validated.checkinSteps?.[5]?.playbackRate).toBe(0.25);

    expect(pageSrc).toContain("During Your Stay — Video Guides");
    expect(pageSrc).toContain("/guide-media/kith-1423/assets/blinds-remote.mp4");
    expect(pageSrc).toContain("/guide-media/kith-1423/assets/hallway-to-unit.mp4");
    expect(pageSrc).toContain("/guide-media/kith-1423/assets/fob-and-garbage-room.mp4");
    expect(
      existsSync(resolve(__dirname, "../../public/guide/index.html")),
    ).toBe(false);
  });
});
