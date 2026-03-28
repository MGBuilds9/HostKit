"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessagePreview } from "./message-preview";

interface RenderedMessage {
  id: string;
  name: string;
  triggerDescription: string | null;
  body: string;
}

export function MessageGenerator({ propertyId }: { propertyId: string }) {
  const [guestName, setGuestName] = useState("");
  const [checkinDate, setCheckinDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (guestName) params.set("guestName", guestName);
      if (checkinDate) params.set("checkinDate", checkinDate);
      if (checkoutDate) params.set("checkoutDate", checkoutDate);
      setLoading(true);
      setError(null);
      fetch(`/api/properties/${propertyId}/messages?${params}`)
        .then((r) => { if (!r.ok) throw new Error(`Request failed: ${r.status}`); return r.json(); })
        .then((data: RenderedMessage[]) => { setMessages(data); setLoading(false); })
        .catch((err: Error) => { setError(err.message); setLoading(false); });
    }, 400);
    return () => clearTimeout(t);
  }, [propertyId, guestName, checkinDate, checkoutDate]);

  async function copyMessage(id: string, body: string) {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div>
          <Label>Guest Name</Label>
          <Input placeholder="e.g. Sarah" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="h-12 md:h-10" />
        </div>
        <div>
          <Label>Check-in Date</Label>
          <Input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} className="h-12 md:h-10" />
        </div>
        <div>
          <Label>Checkout Date</Label>
          <Input type="date" value={checkoutDate} onChange={(e) => setCheckoutDate(e.target.value)} className="h-12 md:h-10" />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load messages: {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No message templates found for this property.</p>
        ) : (
          messages.map((msg) => (
            <MessagePreview key={msg.id} msg={msg} copiedId={copiedId} onCopy={copyMessage} />
          ))
        )}
      </div>
    </div>
  );
}
