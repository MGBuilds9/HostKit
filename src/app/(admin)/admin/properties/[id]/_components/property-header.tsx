import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "lucide-react";
import {
  Edit,
  MessageSquare,
  ClipboardCheck,
  CalendarDays,
  Settings,
} from "lucide-react";

interface PropertyHeaderProps {
  property: {
    id: string;
    name: string;
    slug: string;
    active: boolean | null;
    addressStreet: string;
    addressUnit?: string | null;
    addressCity: string;
    addressProvince: string;
    addressPostal: string;
    owner: { name: string };
  };
  guideUrl: string;
}

export function PropertyHeader({ property, guideUrl }: PropertyHeaderProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{property.name}</h1>
            <Badge variant={property.active ? "default" : "secondary"}>
              {property.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {property.addressStreet}
            {property.addressUnit && ` Unit ${property.addressUnit}`},{" "}
            {property.addressCity}, {property.addressProvince}{" "}
            {property.addressPostal}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Owner: {property.owner.name} &middot; Slug:{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{property.slug}</code>
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={`/admin/properties/${property.id}/edit`}>
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/properties/${property.id}/calendar`}>
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Calendar
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/properties/${property.id}/settings`}>
                <Settings className="h-3.5 w-3.5 mr-1.5" /> iCal Settings
              </Link>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/properties/${property.id}/messages`}>
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Messages
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/properties/${property.id}/checklist`}>
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Checklist
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/properties/${property.id}/guide`}>
                <QrCode className="h-3.5 w-3.5 mr-1.5" /> View Guide
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-lg border bg-card p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${property.slug}`}
          alt={`QR code for ${property.name}`}
          className="h-16 w-16 rounded"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5" /> Guest Guide
          </p>
          <a
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline break-all"
          >
            {guideUrl}
          </a>
        </div>
      </div>
    </>
  );
}
