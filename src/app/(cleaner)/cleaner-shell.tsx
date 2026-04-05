"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CleanerBottomNav } from "@/components/cleaner/cleaner-bottom-nav";
import Link from "next/link";

function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data: Array<{ read: boolean }> = await res.json();
        setUnreadCount(data.filter((n) => !n.read).length);
      } catch {
        // silently fail — non-critical
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications" asChild>
      <Link href="/cleaner/profile">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications ({unreadCount} unread)</span>
      </Link>
    </Button>
  );
}

export function CleanerShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">Skip to content</a>
      <div className="flex flex-col h-screen bg-muted/30">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
          <Link href="/cleaner" className="font-semibold text-lg tracking-tight">
            HostKit
          </Link>
          <NotificationBell />
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-20">{children}</main>

        <CleanerBottomNav />
      </div>
    </SessionProvider>
  );
}
