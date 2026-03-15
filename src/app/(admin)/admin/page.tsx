export const dynamic = "force-dynamic";

import { db } from "@/db";
import { properties, turnovers, owners } from "@/db/schema";
import { count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ClipboardCheck } from "lucide-react";

export default async function DashboardPage() {
  const [propertyCount] = await db.select({ count: count() }).from(properties);
  const [ownerCount] = await db.select({ count: count() }).from(owners);
  const [turnoverCount] = await db.select({ count: count() }).from(turnovers);

  const stats = [
    { label: "Properties", value: propertyCount.count, icon: Building2, href: "/admin/properties" },
    { label: "Owners", value: ownerCount.count, icon: Users, href: "/admin/owners" },
    { label: "Turnovers", value: turnoverCount.count, icon: ClipboardCheck, href: "/admin/turnovers" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      {/* Mobile: horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide md:hidden">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-[140px] shrink-0">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop: 3-col grid */}
      <div className="hidden md:grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
