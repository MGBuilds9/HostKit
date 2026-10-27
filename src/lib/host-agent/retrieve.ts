/**
 * Playbook memory: score past threads / draft outcomes so new drafts
 * prefer what Mariam approved and avoid what she rejected.
 */

export const EXAMPLE_LABELS = ["yes", "no", "screening", "stay"] as const;
export type ExampleLabel = (typeof EXAMPLE_LABELS)[number];

export type DraftOutcome = "approved" | "rejected" | "edited" | "sent";

export type RetrievableExample = {
  threadId: string;
  title: string;
  guestName?: string | null;
  labels: ExampleLabel[];
  messages: Array<{ role: string; body: string }>;
  outcomes?: DraftOutcome[];
};

export type RetrievedExample = {
  threadId: string;
  title: string;
  guestName: string | null;
  labels: ExampleLabel[];
  excerpt: string;
  score: number;
  preferred: boolean;
};

const STOP = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "is", "it",
  "this", "that", "with", "at", "as", "be", "are", "was", "were", "i", "we",
  "you", "they", "hi", "hey", "hello", "please", "thanks", "thank",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function scoreExample(query: string, example: RetrievableExample): number {
  const tokens = tokenize(query);
  const haystack = [
    example.title,
    example.guestName ?? "",
    ...example.messages.map((m) => m.body),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }

  if (example.labels.includes("yes")) score += 3;
  if (example.labels.includes("no")) score -= 4;
  if (example.labels.includes("screening")) score += 0.5;
  if (example.labels.includes("stay")) score += 0.5;

  const outcomes = example.outcomes ?? [];
  if (outcomes.includes("approved")) score += 2;
  if (outcomes.includes("rejected")) score -= 3;
  if (outcomes.includes("edited")) score += 0.25;

  return score;
}

function excerptFor(example: RetrievableExample): string {
  const host = example.messages.find((m) => m.role === "host" || m.role === "assistant");
  const any = host ?? example.messages[0];
  const body = (any?.body ?? example.title).replace(/\s+/g, " ").trim();
  return body.length > 240 ? `${body.slice(0, 237)}…` : body;
}

export function retrieveExamples(
  query: string,
  examples: RetrievableExample[],
  limit = 5
): RetrievedExample[] {
  return examples
    .map((example) => {
      const score = scoreExample(query, example);
      const preferred =
        example.labels.includes("yes") || (example.outcomes ?? []).includes("approved");
      return {
        threadId: example.threadId,
        title: example.title,
        guestName: example.guestName ?? null,
        labels: example.labels,
        excerpt: excerptFor(example),
        score,
        preferred,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatExamplesForPrompt(examples: RetrievedExample[]): string {
  if (examples.length === 0) {
    return "No matching historical examples. Draft from HostKit house style; keep it a draft for human review.";
  }
  return examples
    .map((ex, i) => {
      const tags = [
        ...ex.labels,
        ex.preferred ? "preferred" : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `${i + 1}. [${tags}] ${ex.title}${ex.guestName ? ` (${ex.guestName})` : ""}\n${ex.excerpt}`;
    })
    .join("\n\n");
}
