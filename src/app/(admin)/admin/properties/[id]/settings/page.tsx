import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { IcalSettingsForm } from "@/components/admin/ical-settings-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: { id: string };
}

export default async function PropertySettingsPage({ params }: Props) {
  await requireAuth(["admin", "manager"]);

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });

  if (!property) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href={`/admin/properties/${property.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Property
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{property.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calendar sync &amp; turnover settings
        </p>
      </div>

      <IcalSettingsForm property={property} />
    </div>
  );
}
