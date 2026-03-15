"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, MessageSquare, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-4">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === href
              ? "bg-slate-100 text-slate-900 font-medium"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-6 font-semibold text-lg">
        HostKit
      </div>
      <NavLinks />
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white md:hidden">
        <div className="flex h-14 items-center justify-between border-b px-6">
          <span className="font-semibold text-lg">HostKit</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks onClick={onClose} />
      </aside>
    </>
  );
}
