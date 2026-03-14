import Link from "next/link";
import { db } from "@/db";
import { turnovers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus } from "lucide-react";

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

      {turnoverList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No turnovers recorded yet.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href={`/admin/properties/${params.id}/checklist`}>
              Start First Turnover
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {turnoverList.map((t) => {
            const completedAt = new Date(t.completedAt);
            const formattedDate = completedAt.toLocaleDateString("en-CA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const formattedTime = completedAt.toLocaleTimeString("en-CA", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const checklistData = t.checklistData as Array<{
              title: string;
              items: Array<{ label: string; type: string; completed: boolean }>;
            }> | null;

            const totalItems = checklistData?.reduce(
              (sum, section) => sum + section.items.length,
              0
            ) ?? 0;
            const completedItems = checklistData?.reduce(
              (sum, section) =>
                sum + section.items.filter((item) => item.completed).length,
              0
            ) ?? 0;

            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-medium">
                      {formattedDate} at {formattedTime}
                    </CardTitle>
                    {totalItems > 0 && (
                      <Badge
                        variant={completedItems === totalItems ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {completedItems}/{totalItems} items
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {t.completedBy && (
                      <span>
                        <span className="font-medium text-foreground">By:</span>{" "}
                        {t.completedBy}
                      </span>
                    )}
                    {t.nextGuestCheckin && (
                      <span>
                        <span className="font-medium text-foreground">Next check-in:</span>{" "}
                        {new Date(t.nextGuestCheckin).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  {t.notes && (
                    <p className="text-sm text-muted-foreground border-l-2 border-slate-200 pl-3">
                      {t.notes}
                    </p>
                  )}
                  {checklistData && checklistData.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                        View checklist details
                      </summary>
                      <div className="mt-2 space-y-2">
                        {checklistData.map((section) => (
                          <div key={section.title}>
                            <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              {section.title}
                            </p>
                            <ul className="space-y-0.5">
                              {section.items.map((item) => (
                                <li
                                  key={item.label}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className={`h-3 w-3 rounded-sm border flex-shrink-0 ${
                                      item.completed
                                        ? "bg-slate-900 border-slate-900"
                                        : "border-slate-300"
                                    }`}
                                  />
                                  <span
                                    className={
                                      item.completed
                                        ? "text-foreground"
                                        : "text-muted-foreground line-through"
                                    }
                                  >
                                    {item.label}
                                  </span>
                                  {item.type === "restock" && (
                                    <Badge variant="secondary" className="text-xs py-0">
                                      restock
                                    </Badge>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
