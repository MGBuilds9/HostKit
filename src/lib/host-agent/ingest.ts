import { EXAMPLE_LABELS, type ExampleLabel } from "./retrieve";

export type IngestMessageRole = "guest" | "host" | "user" | "assistant" | "system";

export type IngestMessage = {
  role: IngestMessageRole;
  body: string;
  occurredAt?: string;
};

export type IngestThread = {
  title: string;
  guestName?: string;
  channel?: string;
  labels?: ExampleLabel[];
  propertyId?: string;
  messages: IngestMessage[];
};

const ROLE_ALIASES: Record<string, IngestMessageRole> = {
  guest: "guest",
  guest_message: "guest",
  inquirer: "guest",
  host: "host",
  mariam: "host",
  airbnb: "host",
  user: "user",
  assistant: "assistant",
  system: "system",
};

function asLabel(value: unknown): ExampleLabel | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  return (EXAMPLE_LABELS as readonly string[]).includes(lower)
    ? (lower as ExampleLabel)
    : null;
}

function asRole(value: unknown): IngestMessageRole | null {
  if (typeof value !== "string") return null;
  return ROLE_ALIASES[value.trim().toLowerCase()] ?? null;
}

function normalizeThread(raw: unknown, fallbackTitle: string): IngestThread | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const messagesRaw = Array.isArray(obj.messages) ? obj.messages : [];
  const messages: IngestMessage[] = [];
  for (const item of messagesRaw) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const role = asRole(m.role);
    const body = typeof m.body === "string" ? m.body.trim() : typeof m.text === "string" ? m.text.trim() : "";
    if (!role || !body) continue;
    const occurredAt = typeof m.occurredAt === "string" ? m.occurredAt : typeof m.at === "string" ? m.at : undefined;
    messages.push({ role, body, occurredAt });
  }
  if (messages.length === 0) return null;

  const labels = Array.isArray(obj.labels)
    ? obj.labels.map(asLabel).filter((l): l is ExampleLabel => l !== null)
    : [];

  const title =
    (typeof obj.title === "string" && obj.title.trim()) ||
    (typeof obj.subject === "string" && obj.subject.trim()) ||
    fallbackTitle;

  return {
    title,
    guestName: typeof obj.guestName === "string" ? obj.guestName : typeof obj.guest === "string" ? obj.guest : undefined,
    channel: typeof obj.channel === "string" ? obj.channel : "paste",
    labels,
    propertyId: typeof obj.propertyId === "string" ? obj.propertyId : undefined,
    messages,
  };
}

function parseJsonArchive(text: string): IngestThread[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { threads?: unknown }).threads)
      ? (parsed as { threads: unknown[] }).threads
      : parsed && typeof parsed === "object"
        ? [parsed]
        : [];

  const threads: IngestThread[] = [];
  list.forEach((item, i) => {
    const thread = normalizeThread(item, `Imported thread ${i + 1}`);
    if (thread) threads.push(thread);
  });
  return threads.length > 0 ? threads : [];
}

const LINE_ROLE = /^(guest|host|mariam|inquirer|assistant|user|system)\s*[:\-–]\s*(.+)$/i;

function parsePlainArchive(text: string): IngestThread[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const threads: IngestThread[] = [];
  let current: IngestThread | null = null;

  const flush = () => {
    if (current && current.messages.length > 0) threads.push(current);
    current = null;
  };

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const firstRole = LINE_ROLE.exec(lines[0]);
    const looksLikeHeader = !firstRole && (lines[0].startsWith("#") || !LINE_ROLE.test(lines[0]));

    if (looksLikeHeader) {
      flush();
      const title = lines[0].replace(/^#\s*/, "");
      current = {
        title,
        channel: "paste",
        labels: [],
        messages: [],
      };
      for (const line of lines.slice(1)) {
        const match = LINE_ROLE.exec(line);
        if (!match) continue;
        const role = asRole(match[1]);
        if (!role) continue;
        current.messages.push({ role, body: match[2].trim() });
      }
      continue;
    }

    if (!current) {
      current = {
        title: "Imported thread",
        channel: "paste",
        labels: [],
        messages: [],
      };
    }
    for (const line of lines) {
      const match = LINE_ROLE.exec(line);
      if (!match) continue;
      const role = asRole(match[1]);
      if (!role) continue;
      current.messages.push({ role, body: match[2].trim() });
    }
  }
  flush();
  return threads;
}

export function parseArchiveInput(text: string): IngestThread[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const json = parseJsonArchive(trimmed);
    if (json && json.length > 0) return json;
    if (json) return [];
  }
  return parsePlainArchive(trimmed);
}

export function applyDefaultLabels(
  threads: IngestThread[],
  defaults: ExampleLabel[]
): IngestThread[] {
  if (defaults.length === 0) return threads;
  return threads.map((thread) => ({
    ...thread,
    labels: Array.from(new Set([...(thread.labels ?? []), ...defaults])),
  }));
}
