"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, Bot, Check, Lock, Pencil, SendHorizonal, ThumbsDown, ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ExampleLabel } from "@/lib/host-agent/retrieve";

type DraftStatus = "pending" | "approved" | "sent" | "rejected";

type HostDraft = {
  id: string;
  title: string;
  body: string;
  status: DraftStatus;
  isSafeTemplate: boolean;
  source: string;
  threadId: string | null;
  retrievedThreadIds: string[] | null;
  feedbackNote: string | null;
  sendNote: string | null;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: string;
  body: string;
  occurredAt: string;
};

type ArchiveThread = {
  id: string;
  title: string;
  guestName: string | null;
  channel: string;
  source: string;
  labels: { label: ExampleLabel }[];
  messages: Array<{ id: string; role: string; body: string; occurredAt: string }>;
  property?: { id: string; name: string } | null;
};

type RetrievedExample = {
  threadId: string;
  title: string;
  labels: ExampleLabel[];
  excerpt: string;
  preferred: boolean;
  score: number;
};

const STATUS_TABS: Array<{ value: "all" | DraftStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "rejected", label: "Rejected" },
];

const LABEL_TABS: Array<{ value: "all" | ExampleLabel; label: string }> = [
  { value: "all", label: "All" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "screening", label: "Screening" },
  { value: "stay", label: "Stay" },
];

function statusBadge(status: DraftStatus) {
  if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
  if (status === "approved") return <Badge>Approved</Badge>;
  if (status === "sent") return <Badge variant="outline">Sent</Badge>;
  return <Badge variant="destructive">Rejected</Badge>;
}

function labelBadge(label: ExampleLabel) {
  const variant = label === "no" ? "destructive" : label === "yes" ? "default" : "secondary";
  return (
    <Badge key={label} variant={variant} className="capitalize">
      {label}
    </Badge>
  );
}

export function HostAgentWorkspace({
  lock,
  templates,
  properties,
}: {
  lock: { smarterUnlocked: boolean; locked: boolean; explanation: string };
  templates: Array<{ id: string; name: string }>;
  properties: Array<{ id: string; name: string }>;
}) {
  const [drafts, setDrafts] = useState<HostDraft[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<ArchiveThread[]>([]);
  const [examples, setExamples] = useState<RetrievedExample[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"queue" | "archive">("queue");
  const [statusFilter, setStatusFilter] = useState<"all" | DraftStatus>("all");
  const [labelFilter, setLabelFilter] = useState<"all" | ExampleLabel>("all");
  const [chatInput, setChatInput] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [ingestText, setIngestText] = useState("");
  const [ingestLabels, setIngestLabels] = useState<ExampleLabel[]>([]);
  const [ingestPropertyId, setIngestPropertyId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) ?? null;
  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;

  const filteredDrafts = useMemo(
    () => (statusFilter === "all" ? drafts : drafts.filter((d) => d.status === statusFilter)),
    [drafts, statusFilter]
  );
  const filteredThreads = useMemo(
    () =>
      labelFilter === "all"
        ? threads
        : threads.filter((t) => t.labels.some((row) => row.label === labelFilter)),
    [threads, labelFilter]
  );

  const loadAll = useCallback(async () => {
    const [draftRes, msgRes, threadRes] = await Promise.all([
      fetch("/api/host-agent/drafts"),
      fetch("/api/host-agent/messages"),
      fetch("/api/host-agent/threads"),
    ]);
    if (!draftRes.ok || !msgRes.ok || !threadRes.ok) {
      throw new Error("Could not load host-agent workspace");
    }
    const nextDrafts = (await draftRes.json()) as HostDraft[];
    const msgJson = (await msgRes.json()) as { messages: ChatMessage[] };
    const nextThreads = (await threadRes.json()) as ArchiveThread[];
    setDrafts(nextDrafts);
    setMessages(msgJson.messages);
    setThreads(nextThreads);
    return { nextDrafts };
  }, []);

  useEffect(() => {
    loadAll().catch((err: Error) => setError(err.message));
  }, [loadAll]);

  useEffect(() => {
    if (selectedDraft) setDraftBody(selectedDraft.body);
  }, [selectedDraft]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function actOnDraft(action: "approve" | "reject" | "send" | "edit") {
    if (!selectedDraft) return;
    await run(action, async () => {
      const res = await fetch(`/api/host-agent/drafts/${selectedDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          body: action === "edit" ? draftBody : undefined,
          note: feedbackNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Failed to ${action}`);
      setFeedbackNote("");
      await loadAll();
    });
  }

  async function sendChat(body: string, threadId?: string | null) {
    await run("chat", async () => {
      const res = await fetch("/api/host-agent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          draftId: selectedDraftId,
          threadId: threadId ?? selectedThreadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setChatInput("");
      if (Array.isArray(data.examples)) setExamples(data.examples);
      const { nextDrafts } = await loadAll();
      if (data.draft?.id) {
        setSelectedDraftId(data.draft.id);
        setLeftTab("queue");
      } else if (nextDrafts[0]) {
        setSelectedDraftId(nextDrafts[0].id);
      }
    });
  }

  async function useTemplate() {
    if (!templateId) return;
    await run("template", async () => {
      const res = await fetch("/api/host-agent/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, source: "template" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not use template");
      const { nextDrafts } = await loadAll();
      setSelectedDraftId(data.id ?? nextDrafts[0]?.id ?? null);
      setLeftTab("queue");
    });
  }

  async function importArchive() {
    await run("import", async () => {
      const res = await fetch("/api/host-agent/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: ingestText,
          labels: ingestLabels,
          propertyId: ingestPropertyId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setIngestText("");
      await loadAll();
    });
  }

  async function setThreadLabels(threadId: string, labels: ExampleLabel[]) {
    await run("labels", async () => {
      const res = await fetch(`/api/host-agent/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels }),
      });
      if (!res.ok) throw new Error("Could not update labels");
      await loadAll();
    });
  }

  function toggleIngestLabel(label: ExampleLabel) {
    setIngestLabels((current) =>
      current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
    );
  }

  const canApprove = selectedDraft?.status === "pending";
  const canReject = selectedDraft?.status === "pending" || selectedDraft?.status === "approved";
  const canEdit = selectedDraft?.status === "pending" || selectedDraft?.status === "approved";
  const canSend =
    selectedDraft != null &&
    selectedDraft.status !== "sent" &&
    selectedDraft.status !== "rejected" &&
    (selectedDraft.status === "approved" || selectedDraft.isSafeTemplate);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Host Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Draft guest replies with playbook memory. Approve, edit, or reject — smarter auto-send stays locked.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Approver lock</p>
              <p className="text-sm text-muted-foreground">{lock.explanation}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={lock.smarterUnlocked}
              disabled
              aria-label="Smarter auto-send unlock"
            />
            <span className="text-xs text-muted-foreground">
              {lock.smarterUnlocked ? "Unlock flag on" : "Smarter auto-send off"}
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as "queue" | "archive")}>
              <TabsList className="w-full">
                <TabsTrigger value="queue" className="flex-1">Draft queue</TabsTrigger>
                <TabsTrigger value="archive" className="flex-1">Archive</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-3">
            {leftTab === "queue" ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {STATUS_TABS.map((tab) => (
                    <Button
                      key={tab.value}
                      size="sm"
                      variant={statusFilter === tab.value ? "default" : "outline"}
                      onClick={() => setStatusFilter(tab.value)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                {templates.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" variant="outline" onClick={useTemplate} disabled={!templateId || busy === "template"}>
                      Use template
                    </Button>
                  </div>
                )}
                {filteredDrafts.length === 0 ? (
                  <EmptyState
                    icon={Bot}
                    title="No drafts yet"
                    description="Chat with the host agent or use a safe template. New replies stay in this queue."
                    dashed
                  />
                ) : (
                  <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
                    {filteredDrafts.map((draft) => (
                      <li key={draft.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDraftId(draft.id);
                            setSelectedThreadId(draft.threadId);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-colors",
                            selectedDraftId === draft.id
                              ? "border-primary bg-accent/60"
                              : "hover:bg-accent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium line-clamp-1">{draft.title}</p>
                            {statusBadge(draft.status)}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{draft.body}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {draft.isSafeTemplate && <Badge variant="outline">Safe template</Badge>}
                            {draft.retrievedThreadIds && draft.retrievedThreadIds.length > 0 && (
                              <Badge variant="secondary">
                                {draft.retrievedThreadIds.length} examples
                              </Badge>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {LABEL_TABS.map((tab) => (
                    <Button
                      key={tab.value}
                      size="sm"
                      variant={labelFilter === tab.value ? "default" : "outline"}
                      onClick={() => setLabelFilter(tab.value)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <Label htmlFor="archive-import">Import past threads</Label>
                  <Textarea
                    id="archive-import"
                    value={ingestText}
                    onChange={(e) => setIngestText(e.target.value)}
                    placeholder={'JSON { "threads": [...] } or:\n# Screening — May\nGuest: Is the parking included?\nHost: Yes, spot 12.'}
                    className="min-h-[110px]"
                  />
                  <input
                    type="file"
                    accept="application/json,.json,.txt"
                    className="text-xs"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      file.text().then(setIngestText);
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {(["yes", "no", "screening", "stay"] as ExampleLabel[]).map((label) => (
                      <Button
                        key={label}
                        type="button"
                        size="sm"
                        variant={ingestLabels.includes(label) ? "default" : "outline"}
                        onClick={() => toggleIngestLabel(label)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  {properties.length > 0 && (
                    <select
                      value={ingestPropertyId}
                      onChange={(e) => setIngestPropertyId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Any property</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button size="sm" onClick={importArchive} disabled={!ingestText.trim() || busy === "import"}>
                    <Archive className="h-3.5 w-3.5" />
                    Import archive
                  </Button>
                </div>
                {filteredThreads.length === 0 ? (
                  <EmptyState
                    icon={Archive}
                    title="No archived threads"
                    description="Paste Airbnb or Mariam threads so new drafts can retrieve what worked."
                    dashed
                  />
                ) : (
                  <ul className="space-y-2 max-h-[22rem] overflow-y-auto">
                    {filteredThreads.map((thread) => (
                      <li key={thread.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedThreadId(thread.id);
                            setSelectedDraftId(null);
                          }}
                          className={cn(
                            "w-full rounded-lg border p-3 text-left transition-colors",
                            selectedThreadId === thread.id
                              ? "border-primary bg-accent/60"
                              : "hover:bg-accent"
                          )}
                        >
                          <p className="text-sm font-medium line-clamp-1">{thread.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {thread.guestName ?? "Guest"} · {thread.channel} · {thread.messages.length} msgs
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {thread.labels.map((row) => labelBadge(row.label))}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDraft ? selectedDraft.title : selectedThread ? selectedThread.title : "Chat / draft"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDraft ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusBadge(selectedDraft.status)}
                    {selectedDraft.isSafeTemplate && <Badge variant="outline">Safe template</Badge>}
                    {selectedDraft.sendNote && (
                      <p className="text-xs text-muted-foreground">{selectedDraft.sendNote}</p>
                    )}
                  </div>
                  <Textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    disabled={!canEdit}
                    className="min-h-[180px]"
                    aria-label="Draft body"
                  />
                  {examples.length > 0 && (
                    <div className="rounded-md bg-muted/50 p-3 space-y-2">
                      <p className="text-xs font-medium">Retrieved playbook</p>
                      {examples.map((ex) => (
                        <p key={ex.threadId} className="text-xs text-muted-foreground">
                          {ex.preferred ? "Preferred · " : ""}
                          {ex.title}: {ex.excerpt}
                        </p>
                      ))}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="feedback-note">Feedback note</Label>
                    <Textarea
                      id="feedback-note"
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="Why this works or does not — stored for later retrieval"
                      className="min-h-[64px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => actOnDraft("approve")}
                      disabled={!canApprove || !!busy}
                      title={canApprove ? "Approve and remember this as a yes example" : "Only pending drafts can be approved"}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => actOnDraft("edit")}
                      disabled={!canEdit || draftBody.trim() === selectedDraft.body || !!busy}
                      title={canEdit ? "Save edits — later drafts prefer this version" : "Cannot edit this draft"}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Save edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => actOnDraft("reject")}
                      disabled={!canReject || !!busy}
                      title={canReject ? "Reject and remember this as a no example" : "Cannot reject this draft"}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => actOnDraft("send")}
                      disabled={!canSend || !!busy}
                      title={
                        canSend
                          ? "Dry-run send — Airbnb Messaging is not wired"
                          : "Approve first. Only safe templates can skip that gate."
                      }
                    >
                      <Check className="h-3.5 w-3.5" /> Send (dry-run)
                    </Button>
                  </div>
                </>
              ) : selectedThread ? (
                <>
                  <div className="flex flex-wrap gap-1">
                    {(["yes", "no", "screening", "stay"] as ExampleLabel[]).map((label) => {
                      const active = selectedThread.labels.some((row) => row.label === label);
                      return (
                        <Button
                          key={label}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => {
                            const next = active
                              ? selectedThread.labels.map((r) => r.label).filter((l) => l !== label)
                              : [...selectedThread.labels.map((r) => r.label), label];
                            setThreadLabels(selectedThread.id, next);
                          }}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-md border p-3">
                    {selectedThread.messages.map((message) => (
                      <div key={message.id}>
                        <p className="text-xs font-medium capitalize">{message.role}</p>
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      sendChat(
                        `Draft a guest reply for this archived thread: ${selectedThread.title}\n\n${selectedThread.messages
                          .map((m) => `${m.role}: ${m.body}`)
                          .join("\n")}`,
                        selectedThread.id
                      )
                    }
                    disabled={busy === "chat"}
                  >
                    Draft from this thread
                  </Button>
                </>
              ) : (
                <EmptyState
                  icon={Bot}
                  title="Select a draft or talk to the agent"
                  description="The queue holds pending work. Chat below to draft a new reply grounded in the archive."
                  dashed
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chat with host agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[240px] space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ask for a guest reply. The agent pulls yes/approved examples and leaves a draft for you.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                        message.role === "user"
                          ? "ml-8 bg-primary text-primary-foreground"
                          : "mr-8 bg-background border"
                      )}
                    >
                      {message.body}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatInput.trim()) sendChat(chatInput.trim());
                }}
              >
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the host agent to draft a reply…"
                  className="min-h-[72px]"
                />
                <Button type="submit" disabled={!chatInput.trim() || busy === "chat"} className="sm:self-end">
                  <SendHorizonal className="h-4 w-4" />
                  Send
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
