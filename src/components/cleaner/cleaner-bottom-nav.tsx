"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/cleaner", label: "Today", icon: CalendarDays, exact: true },
  { href: "/cleaner/upcoming", label: "Upcoming", icon: Clock },
  { href: "/cleaner/profile", label: "Profile", icon: User },
];

export function CleanerBottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 h-16 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-full items-center justify-around">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
