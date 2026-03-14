"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Check } from "lucide-react";

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
    const params = new URLSearchParams();
    if (guestName) params.set("guestName", guestName);
    if (checkinDate) params.set("checkinDate", checkinDate);
    if (checkoutDate) params.set("checkoutDate", checkoutDate);

    setLoading(true);
    setError(null);

    fetch(`/api/properties/${propertyId}/messages?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then((data: RenderedMessage[]) => {
        setMessages(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [propertyId, guestName, checkinDate, checkoutDate]);

  async function copyMessage(id: string, body: string) {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Guest Name</Label>
          <Input
            placeholder="e.g. Sarah"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>
        <div>
          <Label>Check-in Date</Label>
          <Input
            type="date"
            value={checkinDate}
            onChange={(e) => setCheckinDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Checkout Date</Label>
          <Input
            type="date"
            value={checkoutDate}
            onChange={(e) => setCheckoutDate(e.target.value)}
          />
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
          <p className="text-sm text-muted-foreground">
            No message templates found for this property.
          </p>
        ) : (
          messages.map((msg) => (
            <Card key={msg.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{msg.name}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyMessage(msg.id, msg.body)}
                  >
                    {copiedId === msg.id ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copiedId === msg.id ? "Copied!" : "Copy"}
                  </Button>
                </div>
                {msg.triggerDescription && (
                  <p className="text-xs text-muted-foreground">{msg.triggerDescription}</p>
                )}
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-lg p-4 font-sans">
                  {msg.body}
                </pre>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
