/**
 * Thin integration point that wakes the external Airbnb Host agent.
 * Prefer HOST_AGENT_WEBHOOK_*; fall back to LiteLLM; otherwise a local stub
 * so the admin workspace still drafts without Coolify secrets.
 */

import {
  formatExamplesForPrompt,
  type RetrievedExample,
} from "./retrieve";
import { isSmarterAutoSendUnlocked } from "./auto-send";

export const DEFAULT_HOST_AGENT_ID = "e28d25b4-4284-4306-a5a5-4f32ab4e0986";

export type HostAgentDraftSuggestion = {
  title: string;
  body: string;
  isSafeTemplate: boolean;
};

export type HostAgentReply = {
  reply: string;
  draft: HostAgentDraftSuggestion | null;
  source: "webhook" | "litellm" | "stub";
};

export type HostAgentCallInput = {
  message: string;
  examples: RetrievedExample[];
  selectedDraft?: { id: string; title: string; body: string; status: string } | null;
  threadExcerpt?: string | null;
};

type EnvLike = Record<string, string | undefined>;

function agentId(env: EnvLike = process.env): string {
  return env.HOST_AGENT_ID?.trim() || DEFAULT_HOST_AGENT_ID;
}

function webhookHeaders(env: EnvLike = process.env): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = env.HOST_AGENT_WEBHOOK_TOKEN || env.HOST_AGENT_WEBHOOK_SECRET;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function parseAgentPayload(data: unknown): { reply: string; draft: HostAgentDraftSuggestion | null } {
  if (!data || typeof data !== "object") {
    return { reply: String(data ?? ""), draft: null };
  }
  const obj = data as Record<string, unknown>;
  const reply =
    (typeof obj.reply === "string" && obj.reply) ||
    (typeof obj.message === "string" && obj.message) ||
    (typeof obj.content === "string" && obj.content) ||
    "";
  const rawDraft = obj.draft;
  let draft: HostAgentDraftSuggestion | null = null;
  if (rawDraft && typeof rawDraft === "object") {
    const d = rawDraft as Record<string, unknown>;
    const body = typeof d.body === "string" ? d.body.trim() : "";
    if (body) {
      draft = {
        title: typeof d.title === "string" && d.title.trim() ? d.title.trim() : "Suggested guest reply",
        body,
        isSafeTemplate: d.isSafeTemplate === true,
      };
    }
  }
  return { reply: reply || "Draft ready for review.", draft };
}

async function callWebhook(
  input: HostAgentCallInput,
  env: EnvLike
): Promise<HostAgentReply | null> {
  const url = env.HOST_AGENT_WEBHOOK_URL?.trim();
  if (!url) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: webhookHeaders(env),
    body: JSON.stringify({
      agentId: agentId(env),
      message: input.message,
      examples: input.examples,
      selectedDraft: input.selectedDraft ?? null,
      threadExcerpt: input.threadExcerpt ?? null,
      autoSendUnlocked: isSmarterAutoSendUnlocked(env),
    }),
  });
  if (!res.ok) {
    throw new Error(`Host agent webhook returned ${res.status}`);
  }
  const parsed = parseAgentPayload(await res.json());
  return { ...parsed, source: "webhook" };
}

function extractJsonObject(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callLiteLlm(
  input: HostAgentCallInput,
  env: EnvLike
): Promise<HostAgentReply | null> {
  const base = env.LITELLM_BASE_URL?.trim().replace(/\/$/, "");
  const key = env.LITELLM_API_KEY?.trim();
  if (!base || !key) return null;

  const model = env.LITELLM_MODEL?.trim() || "grok-4";
  const system = [
    "You are the Airbnb Host agent for HostKit (Kith 1423 / Mariam).",
    "Draft a guest-facing reply grounded in the retrieved historical examples.",
    "Prefer examples labeled yes / approved. Avoid patterns from no / rejected.",
    "Do not claim the message was sent. Smarter auto-send is locked.",
    "Respond as JSON: {\"reply\":\"short operator note\",\"draft\":{\"title\":\"...\",\"body\":\"...\",\"isSafeTemplate\":false}}",
    "",
    "Retrieved examples:",
    formatExamplesForPrompt(input.examples),
    input.selectedDraft
      ? `\nSelected draft (${input.selectedDraft.status}): ${input.selectedDraft.body}`
      : "",
    input.threadExcerpt ? `\nThread:\n${input.threadExcerpt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input.message },
      ],
      temperature: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`LiteLLM returned ${res.status}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const extracted = extractJsonObject(content);
  const parsed = extracted
    ? parseAgentPayload(extracted)
    : {
        reply: "Draft ready for review.",
        draft: content.trim()
          ? { title: "Suggested guest reply", body: content.trim(), isSafeTemplate: false }
          : null,
      };
  return { ...parsed, source: "litellm" };
}

export function stubHostAgentReply(input: HostAgentCallInput): HostAgentReply {
  const preferred = input.examples.filter((e) => e.preferred);
  const grounding =
    input.examples.length === 0
      ? "No archive matches yet — I drafted from house style. Import past threads so the next reply can learn."
      : `Grounded in ${input.examples.length} past thread${input.examples.length === 1 ? "" : "s"}${
          preferred.length ? ` (preferring ${preferred.length} approved/yes)` : ""
        }.`;

  const exampleHint = preferred[0]?.excerpt ?? input.examples[0]?.excerpt;
  const selected = input.selectedDraft?.body;
  const body = [
    "Hi!",
    "",
    selected
      ? selected
      : `Thanks for reaching out — I can help with that.${
          input.message.trim() ? ` You asked: ${input.message.trim().slice(0, 280)}` : ""
        }`,
    exampleHint ? `\n(Style note from a past approved reply: ${exampleHint.slice(0, 180)})` : "",
    "",
    "Let me know if you need anything else before check-in.",
    "",
    "— Mariam",
  ]
    .filter((line) => line !== "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return {
    reply: `${grounding} Review the draft, then Approve / Edit / Reject. Smarter auto-send is locked.`,
    draft: {
      title: input.selectedDraft?.title ?? "Suggested guest reply",
      body,
      isSafeTemplate: false,
    },
    source: "stub",
  };
}

export async function callHostAgent(
  input: HostAgentCallInput,
  env: EnvLike = process.env
): Promise<HostAgentReply> {
  try {
    const webhook = await callWebhook(input, env);
    if (webhook) return webhook;
  } catch (error) {
    console.error("[host-agent] webhook failed, trying next transport", error);
  }
  try {
    const litellm = await callLiteLlm(input, env);
    if (litellm) return litellm;
  } catch (error) {
    console.error("[host-agent] LiteLLM failed, using stub", error);
  }
  return stubHostAgentReply(input);
}
