import { requireAuth } from "@/lib/auth-guard";
import { NewStayForm } from "@/components/admin/new-stay-form";

interface Props {
  params: { id: string };
}

export default async function NewStayPage({ params }: Props) {
  await requireAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add Stay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manually create a booking or block a date range for this property.
        </p>
      </div>
      <NewStayForm propertyId={params.id} />
    </div>
  );
}
