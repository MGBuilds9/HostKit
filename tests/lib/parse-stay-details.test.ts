import { describe, it, expect } from "vitest";
import { parseAirbnbDescription, parseGoogleEvent } from "@/lib/parse-stay-details";
import { computeStayHash, type ParsedStay } from "@/lib/ical-sync";

describe("parseAirbnbDescription", () => {
  it("extracts confirmation (HM) code, phone, guests and email from an Airbnb-style description", () => {
    const d = parseAirbnbDescription(
      "Reserved",
      "Guest: Jane Smith\nReservation code: HM8X2K4N9P\nPhone: +1 (416) 555-0142\nGuests: 3\nhttps://www.airbnb.ca/hosting/reservations/details/HM8X2K4N9P"
    );
    expect(d.confirmationCode).toBe("HM8X2K4N9P");
    expect(d.guestPhone).toContain("416");
    expect(d.guestCount).toBe(3);
    expect(d.bookingUrl).toContain("airbnb.ca");
  });

  it("handles a bare 'Not available' block without inventing details", () => {
    const d = parseAirbnbDescription("Not available", "");
    expect(d.confirmationCode).toBeNull();
    expect(d.guestCount).toBeNull();
    expect(d.guestEmail).toBeNull();
  });

  it("parses a generic confirmation code variant", () => {
    const d = parseAirbnbDescription("Booking", "Confirmation #: BC123XYZ");
    expect(d.confirmationCode).toBeTruthy();
  });
});

describe("parseGoogleEvent", () => {
  it("reads attendees, extendedProperties, location, and description details", () => {
    const d = parseGoogleEvent({
      summary: "Booking — Jane Doe",
      description: "Guest: jane@example.com\nPhone: +14165550199\nGuests: 2",
      location: "2485 Eglinton Ave W, Toronto",
      attendees: [{ email: "jane@example.com", displayName: "Jane Doe" }],
      extendedProperties: { private: { confirmationCode: "G-AB12CD34" } },
    });
    expect(d.guestEmail).toBe("jane@example.com");
    expect(d.guestPhone).toContain("4165550199");
    expect(d.guestCount).toBe(2);
    expect(d.confirmationCode).toBe("G-AB12CD34");
    expect(d.eventLocation).toContain("Eglinton");
  });

  it("returns all-null-ish for a bare event", () => {
    const d = parseGoogleEvent({ summary: "Hold" });
    expect(d.guestEmail).toBeNull();
    expect(d.confirmationCode).toBeNull();
    expect(d.guestCount).toBeNull();
  });

  it("description email does not override a channel-manager extendedProperties confirmation", () => {
    const d = parseGoogleEvent({
      summary: "Booking",
      description: "Confirmation: DESC12345",
      extendedProperties: { shared: { reservationCode: "HMZZ999888" } },
    });
    // extendedProperties wins for confirmation
    expect(d.confirmationCode).toBe("HMZZ999888");
  });
});

describe("computeStayHash enrichment sensitivity", () => {
  const base: ParsedStay = {
    externalUid: "uid-1",
    startDate: new Date("2026-06-01T14:00:00Z"),
    endDate: new Date("2026-06-05T11:00:00Z"),
    summary: "John Smith",
    description: "",
    status: "booked",
    guestName: "John Smith",
    source: "airbnb",
  };

  it("changes hash when enrichment changes (drives update)", () => {
    const enriched: ParsedStay = { ...base, guestEmail: "john@example.com", confirmationCode: "HM12345678" };
    expect(computeStayHash(enriched)).not.toBe(computeStayHash(base));
  });

  it("stable for identical stays", () => {
    const a: ParsedStay = { ...base, guestEmail: "a@b.co", guestCount: 2 };
    const b: ParsedStay = { ...base, guestEmail: "a@b.co", guestCount: 2 };
    expect(computeStayHash(a)).toBe(computeStayHash(b));
  });
});
