// Parse booking detail (guest email/phone/count, confirmation code, booking
// URL, location) out of calendar events from Google Calendar or Airbnb iCal.
// Sources are messy and heterogeneous, so every parser is defensive: it returns
// null/undefined rather than throwing, and never overwrites a value it couldn't
// confidently extract.

export interface ParsedDetails {
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCount?: number | null;
  confirmationCode?: string | null;
  bookingUrl?: string | null;
  eventLocation?: string | null;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// Intl-style phone: optional +, digits/spaces/dashes/parens, 7-16 digits total.
const PHONE_RE = /\+?[0-9][0-9\s().-]{6,16}[0-9]/;
// Confirmation / reservation codes like HM8X2K4N9P or a bare alphanum code.
const CONF_RE = /\b(?:confirmation|reservation|booking|conf|res)[\s#:]*(?:code|number|no\.?|id)?[\s#:]*([A-Z0-9]{6,12})\b/i;
const HMCODE_RE = /\b(HM[A-Z0-9]{8})\b/;
// "3 guests", "guests: 4", "2 adults", "guest count 5".
const GUESTS_RE = /\b(?:guests?|guest count|guests? count|adults?|people|party of)[\s:=]*(\d{1,2})\b/i;
const NUMLABEL_RE = /\b(\d{1,2})\s*(?:guests?|adults?|people)\b/i;

function pickEmail(text: string): string | null {
  const m = text.match(EMAIL_RE);
  return m ? m[0] : null;
}
function pickPhone(text: string): string | null {
  const m = text.match(PHONE_RE);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16 ? m[0].trim() : null;
}
function pickConfirmation(text: string): string | null {
  const hm = text.match(HMCODE_RE);
  if (hm) return hm[1];
  const m = text.match(CONF_RE);
  return m ? m[1].toUpperCase() : null;
}
function pickGuests(text: string): number | null {
  const a = text.match(GUESTS_RE);
  if (a) return parseInt(a[1], 10);
  const b = text.match(NUMLABEL_RE);
  if (b) return parseInt(b[1], 10);
  return null;
}
function pickUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)>"']+/);
  return m ? m[0] : null;
}

/** Parse an Airbnb iCal event's summary + description. */
export function parseAirbnbDescription(summary: string, description: string): ParsedDetails {
  const blob = `${summary}\n${description}`;
  return {
    guestEmail: pickEmail(blob),
    guestPhone: pickPhone(blob),
    guestCount: pickGuests(blob),
    confirmationCode: pickConfirmation(blob),
    bookingUrl: pickUrl(description),
    eventLocation: null,
  };
}

interface GoogleAttendee {
  email?: string;
  displayName?: string;
}
interface GoogleExtendedProps {
  private?: Record<string, string>;
  shared?: Record<string, string>;
}

/** Parse a Google Calendar event (already fetched) into booking details. */
export function parseGoogleEvent(event: {
  summary?: string;
  description?: string;
  location?: string;
  attendees?: GoogleAttendee[];
  extendedProperties?: GoogleExtendedProps;
}): ParsedDetails {
  const description = (event.description ?? "").trim();
  const ext = {
    ...(event.extendedProperties?.shared ?? {}),
    ...(event.extendedProperties?.private ?? {}),
  };

  // Attendees: the first attendee that isn't the calendar owner is usually the guest.
  const guestAttendee = (event.attendees ?? []).find((a) => a.email);

  // extendedProperties from channel managers commonly carry these keys.
  const extConf =
    ext.confirmationCode ?? ext.confirmation_code ?? ext.reservationCode ?? ext.reservation ?? ext.confirmation;
  const extGuests = ext.guestCount ?? ext.guests ?? ext.numGuests ?? ext.num_guests;
  const extPhone = ext.guestPhone ?? ext.phone ?? ext.phoneNumber;
  const extUrl = ext.bookingUrl ?? ext.booking_url ?? ext.url ?? ext.link;

  return {
    guestEmail: pickEmail(description) ?? guestAttendee?.email ?? null,
    guestPhone: extPhone ?? pickPhone(description),
    guestCount: extGuests ? parseInt(String(extGuests), 10) || null : pickGuests(description),
    // extendedProperties (channel managers) are authoritative for confirmation;
    // fall back to the description text otherwise.
    confirmationCode: extConf ? String(extConf) : pickConfirmation(description),
    bookingUrl: extUrl ?? pickUrl(description),
    eventLocation: (event.location ?? "").trim() || null,
  };
}
