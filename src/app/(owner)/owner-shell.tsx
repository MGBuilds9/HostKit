"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { OwnerBottomNav } from "@/components/owner/owner-bottom-nav";
import Link from "next/link";

function OwnerTopbar() {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
      <Link href="/owner" className="font-semibold text-lg tracking-tight">
        HostKit
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {session?.user?.name}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.user?.image ?? undefined} />
          <AvatarFallback>{session?.user?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

export function OwnerShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
      >
        Skip to content
      </a>
      <div className="flex flex-col h-screen bg-muted/30">
        <OwnerTopbar />
        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-20">
          <div className="max-w-5xl mx-auto w-full">{children}</div>
        </main>
        <OwnerBottomNav />
      </div>
    </SessionProvider>
  );
}
