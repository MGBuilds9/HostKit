"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/owner/properties", label: "Properties", icon: Building2 },
  { href: "/owner/statements", label: "Statements", icon: FileText },
  { href: "/owner/documents", label: "Documents", icon: FolderOpen },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-6 font-semibold text-lg gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-primary-foreground"
          style={{ background: "hsl(var(--primary))" }}
        >
          H
        </span>
        HostKit
      </div>
      <nav className="flex-1 space-y-0.5 p-4" aria-label="Owner navigation">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
