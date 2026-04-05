"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export function PushSubscribeButton() {
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for push support and existing subscription on mount
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY) {
      setLoading(false);
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }
    setSupported(true);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(!!sub);
      })
      .catch(() => {
        // Ignore — browser may block push in certain contexts
      })
      .finally(() => setLoading(false));
  }, []);

  async function subscribe() {
    if (!VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const keys = json.keys as { p256dh: string; auth: string } | undefined;

      if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
        throw new Error("Incomplete subscription data");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) throw new Error("Server rejected subscription");

      setSubscribed(true);
      toast({ title: "Push notifications enabled" });
    } catch (err) {
      console.error("[push] subscribe error:", err);
      toast({
        title: "Could not enable push notifications",
        description: "Please check your browser permissions and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setSubscribed(false);
      toast({ title: "Push notifications disabled" });
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
      toast({
        title: "Could not disable push notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // VAPID key not configured
  if (!VAPID_PUBLIC_KEY) {
    return (
      <p className="text-xs text-muted-foreground">
        Push notifications not configured
      </p>
    );
  }

  // Browser doesn't support push
  if (!loading && !supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Push notifications are not supported in this browser
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : subscribed ? (
        <BellOff className="h-4 w-4 mr-2" />
      ) : (
        <Bell className="h-4 w-4 mr-2" />
      )}
      {loading
        ? "Loading…"
        : subscribed
        ? "Disable push notifications"
        : "Enable push notifications"}
    </Button>
  );
}
