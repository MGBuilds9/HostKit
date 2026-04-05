export const dynamic = "force-dynamic";

import { db } from "@/db";
import { owners, properties, ownerStatements } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { OwnerStatementTable } from "@/components/owner/owner-statement-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText } from "lucide-react";

export default async function OwnerStatementsPage() {
  const session = await requireAuth(["owner", "admin"]);

  const owner = await db.query.owners.findFirst({
    where: or(
      eq(owners.userId, session.user.id),
      eq(owners.email, session.user.email!)
    ),
  });

  if (!owner) {
    if (session.user.role === "admin") redirect("/admin");
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Statements</h1>
        <p className="text-muted-foreground">
          Your owner profile has not been set up yet. Please contact your property manager.
        </p>
      </div>
    );
  }

  // Get owner's properties for filter
  const ownerProperties = await db.query.properties.findMany({
    where: eq(properties.ownerId, owner.id),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  const propertyMap = new Map(ownerProperties.map((p) => [p.id, p.name]));

  // Get all statements
  const statements = await db
    .select()
    .from(ownerStatements)
    .where(eq(ownerStatements.ownerId, owner.id))
    .orderBy(ownerStatements.month);

  const statementsWithNames = statements.map((s) => ({
    id: s.id,
    propertyId: s.propertyId,
    propertyName: propertyMap.get(s.propertyId) ?? "Unknown Property",
    month: s.month,
    revenue: s.revenue,
    expenses: s.expenses,
    payout: s.payout,
    status: s.status,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Statements</h1>

      {statementsWithNames.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No statements"
          description="No financial statements have been created yet."
        />
      ) : (
        <OwnerStatementTable
          statements={statementsWithNames}
          properties={ownerProperties.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}
    </div>
  );
}
