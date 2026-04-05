import Link from "next/link";
import { db } from "@/db";
import { requireAuth } from "@/lib/auth-guard";
import { OwnerCard } from "@/components/admin/owner-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users } from "lucide-react";

export default async function OwnersPage() {
  await requireAuth(["admin", "manager"]);

  const ownerList = await db.query.owners.findMany({
    with: { properties: true },
    orderBy: (o, { asc }) => [asc(o.name)],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Owners</h1>
        <Button asChild>
          <Link href="/admin/owners/new">
            <Plus className="h-4 w-4 mr-2" /> Add Owner
          </Link>
        </Button>
      </div>

      {ownerList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No owners yet"
          description="Add your first owner to get started."
          action={
            <Button asChild>
              <Link href="/admin/owners/new">
                <Plus className="h-4 w-4 mr-2" /> Add Owner
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ownerList.map((owner) => (
            <OwnerCard
              key={owner.id}
              id={owner.id}
              name={owner.name}
              email={owner.email}
              phone={owner.phone ?? null}
              propertyCount={owner.properties.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
