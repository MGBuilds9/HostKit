export const dynamic = "force-dynamic";

import { db } from "@/db";
import { cleaners, cleaningTasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { count, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CleanerActions } from "./cleaner-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Mail, Phone, ExternalLink, SprayCan } from "lucide-react";

export default async function CleanersPage() {
  await requireAuth(["admin", "manager"]);

  const cleanerRows = await db
    .select({
      id: cleaners.id,
      fullName: cleaners.fullName,
      email: cleaners.email,
      phone: cleaners.phone,
      isActive: cleaners.isActive,
      createdAt: cleaners.createdAt,
      taskCount: count(cleaningTasks.id),
    })
    .from(cleaners)
    .leftJoin(
      cleaningTasks,
      sql`${cleaningTasks.assignedCleanerId} = ${cleaners.id} AND ${cleaningTasks.status} != 'cancelled'`
    )
    .groupBy(cleaners.id)
    .orderBy(cleaners.fullName);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cleaners</h1>
        <CleanerActions />
      </div>

      {cleanerRows.length === 0 ? (
        <EmptyState
          icon={SprayCan}
          title="No cleaners yet"
          description="Add your first cleaner to get started."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tasks</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {cleanerRows.map((cleaner) => (
                  <tr key={cleaner.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/cleaners/${cleaner.id}`}
                        className="hover:underline text-foreground"
                      >
                        {cleaner.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cleaner.email ? (
                        <a
                          href={`mailto:${cleaner.email}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {cleaner.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cleaner.phone ? (
                        <a href={`tel:${cleaner.phone}`} className="flex items-center gap-1 hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {cleaner.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cleaner.isActive ? "default" : "secondary"}>
                        {cleaner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {cleaner.taskCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/cleaners/${cleaner.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {cleanerRows.map((cleaner) => (
              <Link key={cleaner.id} href={`/admin/cleaners/${cleaner.id}`}>
                <Card className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{cleaner.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {cleaner.email || "No email"}
                        {cleaner.phone && ` · ${cleaner.phone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm text-muted-foreground">
                        {cleaner.taskCount} task{cleaner.taskCount !== 1 ? "s" : ""}
                      </span>
                      <Badge variant={cleaner.isActive ? "default" : "secondary"}>
                        {cleaner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
