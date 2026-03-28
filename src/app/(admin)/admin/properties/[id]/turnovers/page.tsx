import Link from "next/link";
import { db } from "@/db";
import { turnovers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TurnoverList } from "./_components/turnover-list";

interface Props {
  params: { id: string };
}

export default async function TurnoversPage({ params }: Props) {
  await requireAuth();

  const turnoverList = await db.query.turnovers.findMany({
    where: eq(turnovers.propertyId, params.id),
    orderBy: [desc(turnovers.completedAt)],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Turnover History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Past turnover completions for this property.
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/properties/${params.id}/checklist`}>
            <Plus className="h-4 w-4 mr-2" /> New Turnover
          </Link>
        </Button>
      </div>
      <TurnoverList turnoverList={turnoverList} propertyId={params.id} />
    </div>
  );
}
