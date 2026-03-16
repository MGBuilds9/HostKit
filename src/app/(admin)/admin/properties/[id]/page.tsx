import Link from "next/link";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Edit,
  MessageSquare,
  ClipboardCheck,
  QrCode,
  Wifi,
  Car,
  Clock,
  MapPin,
  Phone,
  ShieldAlert,
  Thermometer,
  CalendarDays,
  Settings,
} from "lucide-react";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const session = await requireAuth();

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });

  if (!property) notFound();

  // Owners can only view their own properties (match by userId or email)
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: or(
        eq(owners.userId, session.user.id),
        eq(owners.email, session.user.email!)
      ),
    });
    if (!owner || property.ownerId !== owner.id) notFound();
  }

  const guideUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/g/${property.slug}`;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
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

        {/* Quick Actions */}
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

      {/* QR Code + Guide Link (compact) */}
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

      <div className="grid gap-4 md:grid-cols-2">
        {/* Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Layout</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {property.layout && <p>Layout: {property.layout}</p>}
            {property.floor && <p>Floor: {property.floor}</p>}
            {property.beds && property.beds.length > 0 && (
              <div>
                <p className="font-medium mb-1">Beds:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {property.beds.map((b, i) => (
                    <li key={i}>
                      {b.count}x {b.type} — {b.location}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!property.layout && !property.floor && !property.beds?.length && (
              <p className="text-muted-foreground">No layout info</p>
            )}
          </CardContent>
        </Card>

        {/* Check-In / Out */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Check-In / Check-Out
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Check-in: <span className="font-medium">{property.checkinTime}</span></p>
            <p>Check-out: <span className="font-medium">{property.checkoutTime}</span></p>
            {property.preArrivalLeadMins != null && (
              <p>Pre-arrival lead: {property.preArrivalLeadMins} mins</p>
            )}
          </CardContent>
        </Card>

        {/* Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Access
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.wifiName && (
              <div>
                <p className="text-muted-foreground text-xs">WiFi Network</p>
                <p>{property.wifiName}</p>
              </div>
            )}
            {property.wifiPassword && (
              <div>
                <p className="text-muted-foreground text-xs">WiFi Password</p>
                <p className="font-mono">{property.wifiPassword}</p>
              </div>
            )}
            {property.buzzerName && (
              <div>
                <p className="text-muted-foreground text-xs">Buzzer Name</p>
                <p>{property.buzzerName}</p>
              </div>
            )}
            {property.buzzerInstructions && (
              <div>
                <p className="text-muted-foreground text-xs">Buzzer Instructions</p>
                <p>{property.buzzerInstructions}</p>
              </div>
            )}
            {!property.wifiName && !property.buzzerName && (
              <p className="text-muted-foreground">No access info</p>
            )}
          </CardContent>
        </Card>

        {/* Parking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4" /> Parking
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.parkingSpot && (
              <div>
                <p className="text-muted-foreground text-xs">Spot</p>
                <p>{property.parkingSpot}</p>
              </div>
            )}
            {property.parkingInstructions && (
              <div>
                <p className="text-muted-foreground text-xs">Instructions</p>
                <p>{property.parkingInstructions}</p>
              </div>
            )}
            {!property.parkingSpot && !property.parkingInstructions && (
              <p className="text-muted-foreground">No parking info</p>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" /> Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.hostPhone && (
              <div>
                <p className="text-muted-foreground text-xs">Host Phone</p>
                <p>{property.hostPhone}</p>
              </div>
            )}
            {property.ownerPhone && (
              <div>
                <p className="text-muted-foreground text-xs">Owner Phone</p>
                <p>{property.ownerPhone}</p>
              </div>
            )}
            {property.emergencyContact && (
              <div>
                <p className="text-muted-foreground text-xs">Emergency Contact</p>
                <p>{property.emergencyContact}</p>
              </div>
            )}
            {!property.hostPhone && !property.ownerPhone && !property.emergencyContact && (
              <p className="text-muted-foreground">No contact info</p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Policies & Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>ID Required: <span className="font-medium">{property.idRequired ? "Yes" : "No"}</span></p>
            {property.idRequired && property.idLeadHours != null && (
              <p>ID Lead Time: {property.idLeadHours}h before check-in</p>
            )}
            <p>3rd Party Allowed: <span className="font-medium">{property.thirdPartyAllowed ? "Yes" : "No"}</span></p>
            {property.thermostatDefault && (
              <p className="flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5" />
                Thermostat Default: {property.thermostatDefault}
              </p>
            )}
            {property.securityNote && (
              <div className="mt-2">
                <p className="text-muted-foreground text-xs">Security Note</p>
                <p>{property.securityNote}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nearby Services */}
      {property.nearbyServices && property.nearbyServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Nearby Services ({property.nearbyServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {property.nearbyServices.map((svc, i) => (
                <div key={i} className="text-sm border rounded p-2">
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-muted-foreground text-xs capitalize">{svc.category}</p>
                  {svc.address && <p className="text-xs text-muted-foreground">{svc.address}</p>}
                  {svc.distance && <p className="text-xs text-muted-foreground">{svc.distance} away</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
