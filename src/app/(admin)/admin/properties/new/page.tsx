import { db } from "@/db";
import { owners } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyForm } from "@/components/admin/property-form";

export default async function NewPropertyPage() {
  await requireAuth(["admin", "manager"]);
  const ownerList = await db.select({ id: owners.id, name: owners.name }).from(owners);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Add Property</h1>
      <PropertyForm owners={ownerList} />
    </div>
  );
}
