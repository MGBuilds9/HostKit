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
      className="fixed bottom-0 inset-x-0 z-40 h-16 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      aria-label="Owner navigation"
    >
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
