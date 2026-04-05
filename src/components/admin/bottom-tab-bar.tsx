"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Building2, CalendarDays, MessageSquare, MoreHorizontal, Users, Settings, LogOut, ClipboardCheck, SprayCan } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const tabs = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, matchPrefix: true },
  { href: "/admin/cleaning-tasks", label: "Tasks", icon: SprayCan, matchPrefix: true },
];

const moreLinks = [
  { href: "/admin/turnovers", label: "Turnovers", icon: ClipboardCheck },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/cleaners", label: "Cleaners", icon: Users },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string, matchPrefix?: boolean) {
    if (matchPrefix) return pathname.startsWith(href);
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-40 h-16 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile navigation">
        <div className="flex h-full items-center justify-around">
          {tabs.map(({ href, label, icon: Icon, matchPrefix }) => {
            const active = isActive(href, matchPrefix);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More options"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors",
              moreOpen ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {moreLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
