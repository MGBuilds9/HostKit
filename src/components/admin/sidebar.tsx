"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home, Building2, ClipboardCheck, MessageSquare, Users,
  Settings, CalendarDays, SprayCan, UserCog, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainGroups = [
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
];

const settingsLinks = [
  { href: "/admin/settings", label: "Account", icon: Settings },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/cleaners", label: "Cleaners", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: MessageSquare },
  { href: "/admin/settings/users", label: "Users", icon: UserCog },
];

const settingsPaths = settingsLinks.map((l) => l.href);

export function Sidebar() {
  const pathname = usePathname();

  const isOnSettingsPage = settingsPaths.some((p) =>
    p === "/admin/settings" ? pathname === p || pathname.startsWith("/admin/settings/") : pathname.startsWith(p)
  );

  const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);

  useEffect(() => {
    if (isOnSettingsPage) setSettingsOpen(true);
  }, [isOnSettingsPage]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/settings") return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card shadow-sm">
      <div className="flex h-14 items-center border-b px-5 font-semibold text-lg gap-2">
        <svg width="28" height="28" viewBox="0 0 512 512" className="shrink-0" aria-hidden="true">
          <rect width="512" height="512" rx="64" fill="var(--primary)"/>
          <g fill="none" stroke="var(--primary-foreground)" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
            <line x1="168" y1="180" x2="168" y2="400"/>
            <line x1="344" y1="180" x2="344" y2="400"/>
            <line x1="168" y1="290" x2="344" y2="290"/>
            <polyline points="120,200 256,110 392,200"/>
          </g>
        </svg>
        HostKit
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto p-4" aria-label="Main navigation">
        {mainGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-r-lg px-3 text-sm transition-colors",
                      active
                        ? "border-l-2 border-primary bg-accent/60 text-foreground font-medium"
                        : "border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Toggle settings"
            aria-expanded={settingsOpen}
            className="flex w-full items-center justify-between px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Settings
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-200", settingsOpen && "rotate-180")}
            />
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              settingsOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="space-y-1">
              {settingsLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[40px] items-center gap-3 rounded-r-lg px-3 text-sm transition-colors",
                      active
                        ? "border-l-2 border-primary bg-accent/60 text-foreground font-medium"
                        : "border-l-2 border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
