import { requireAuth } from "@/lib/auth-guard";
import { TurnoverChecklist } from "@/components/admin/turnover-checklist";

interface Props {
  params: { id: string };
}

export default async function ChecklistPage({ params }: Props) {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Turnover Checklist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete all items before marking the turnover done.
        </p>
      </div>
      <TurnoverChecklist propertyId={params.id} />
    </div>
  );
}
