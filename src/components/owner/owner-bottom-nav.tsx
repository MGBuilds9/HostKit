"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, FileText, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/owner/properties", label: "Properties", icon: Building2 },
  { href: "/owner/statements", label: "Statements", icon: FileText },
  { href: "/owner/documents", label: "Documents", icon: FolderOpen },
];

export function OwnerBottomNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 h-16 border-t bg-background/95 shadow-[0_-4px_16px_-6px_color-mix(in oklab, var(--foreground) 8%, transparent)] backdrop-blur-sm pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Owner navigation"
    >
      <div className="flex h-full items-center justify-around px-2">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-[56px] min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
