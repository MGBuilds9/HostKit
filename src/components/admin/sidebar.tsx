"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, ClipboardCheck, MessageSquare, Users, Settings, CalendarDays, SprayCan } from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Main",
    links: [
      { href: "/admin", label: "Dashboard", icon: Home },
      { href: "/admin/properties", label: "Properties", icon: Building2 },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/admin/cleaning-tasks", label: "Cleaning Tasks", icon: SprayCan },
      { href: "/admin/turnovers", label: "Turnovers", icon: ClipboardCheck },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/admin/owners", label: "Owners", icon: Users },
      { href: "/admin/cleaners", label: "Cleaners", icon: Users },
      { href: "/admin/templates", label: "Templates", icon: MessageSquare },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6 font-semibold text-lg">
        HostKit
      </div>
      <nav className="flex-1 space-y-6 p-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-r-lg px-3 py-2 text-sm transition-colors",
                    isActive(href)
                      ? "border-l-2 border-primary bg-accent/50 text-foreground font-medium"
                      : "border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
