"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Menu } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{session?.user?.name}</span>
        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.user?.image ?? undefined} />
          <AvatarFallback>{session?.user?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
