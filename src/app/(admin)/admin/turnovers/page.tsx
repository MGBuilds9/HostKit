import { db } from "@/db";
import { turnovers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { TurnoverFilters } from "./_components/turnover-filters";

export default async function AllTurnoversPage() {
  await requireAuth();

  const turnoverList = await db.query.turnovers.findMany({
    orderBy: [desc(turnovers.completedAt)],
    with: { property: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Turnovers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All turnover completions across properties.
          </p>
        </div>
      </div>
      <TurnoverFilters turnoverList={turnoverList} />
    </div>
  );
}
