"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-6 font-semibold text-lg">HostKit</div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
