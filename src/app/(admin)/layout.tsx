"use client";

import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { BottomTabBar } from "@/components/admin/bottom-tab-bar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 bg-muted">
            {children}
          </main>
        </div>
        <BottomTabBar />
      </div>
    </SessionProvider>
  );
}
