"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function Topbar() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card/80 px-4 shadow-sm backdrop-blur-sm md:px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Toggle theme">
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="h-4 w-4 mr-2" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="h-4 w-4 mr-2" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="h-4 w-4 mr-2" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
        <span className="text-sm text-muted-foreground hidden sm:inline">{session?.user?.name}</span>
        <Avatar className="h-8 w-8 ring-1 ring-border">
          <AvatarImage src={session?.user?.image ?? undefined} />
          <AvatarFallback>{session?.user?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={() => signOut()}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
