import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Wifi, Car, Phone, ShieldAlert, MapPin, Thermometer } from "lucide-react";

interface BedInfo { count: number; type: string; location: string; }
interface NearbyService { name: string; category: string; address?: string | null; distance?: string | null; }

interface PropertyDetailsProps {
  property: {
    layout?: string | null; floor?: string | null; beds?: BedInfo[] | null;
    checkinTime: string; checkoutTime: string; preArrivalLeadMins?: number | null;
    wifiName?: string | null; wifiPassword?: string | null; buzzerName?: string | null; buzzerInstructions?: string | null;
    parkingSpot?: string | null; parkingInstructions?: string | null;
    hostPhone?: string | null; ownerPhone?: string | null; emergencyContact?: string | null;
    idRequired?: boolean | null; idLeadHours?: number | null; thirdPartyAllowed?: boolean | null;
    thermostatDefault?: string | null; securityNote?: string | null; nearbyServices?: NearbyService[] | null;
  };
}

export function PropertyDetails({ property }: PropertyDetailsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Layout</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {property.layout && <p>Layout: {property.layout}</p>}
            {property.floor && <p>Floor: {property.floor}</p>}
            {property.beds && property.beds.length > 0 && (
              <div>
                <p className="font-medium mb-1">Beds:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  {property.beds.map((b, i) => (
                    <li key={i}>{b.count}x {b.type} — {b.location}</li>
                  ))}
                </ul>
              </div>
            )}
            {!property.layout && !property.floor && !property.beds?.length && (
              <p className="text-muted-foreground">No layout info</p>
            )}
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Wifi className="h-4 w-4" /> Access</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.wifiName && <div><p className="text-muted-foreground text-xs">WiFi Network</p><p>{property.wifiName}</p></div>}
            {property.wifiPassword && <div><p className="text-muted-foreground text-xs">WiFi Password</p><p className="font-mono">{property.wifiPassword}</p></div>}
            {property.buzzerName && <div><p className="text-muted-foreground text-xs">Buzzer Name</p><p>{property.buzzerName}</p></div>}
            {property.buzzerInstructions && <div><p className="text-muted-foreground text-xs">Buzzer Instructions</p><p>{property.buzzerInstructions}</p></div>}
            {!property.wifiName && !property.buzzerName && <p className="text-muted-foreground">No access info</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Car className="h-4 w-4" /> Parking</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.parkingSpot && <div><p className="text-muted-foreground text-xs">Spot</p><p>{property.parkingSpot}</p></div>}
            {property.parkingInstructions && <div><p className="text-muted-foreground text-xs">Instructions</p><p>{property.parkingInstructions}</p></div>}
            {!property.parkingSpot && !property.parkingInstructions && <p className="text-muted-foreground">No parking info</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Contacts</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {property.hostPhone && <div><p className="text-muted-foreground text-xs">Host Phone</p><p>{property.hostPhone}</p></div>}
            {property.ownerPhone && <div><p className="text-muted-foreground text-xs">Owner Phone</p><p>{property.ownerPhone}</p></div>}
            {property.emergencyContact && <div><p className="text-muted-foreground text-xs">Emergency Contact</p><p>{property.emergencyContact}</p></div>}
            {!property.hostPhone && !property.ownerPhone && !property.emergencyContact && <p className="text-muted-foreground">No contact info</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Policies & Settings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>ID Required: <span className="font-medium">{property.idRequired ? "Yes" : "No"}</span></p>
            {property.idRequired && property.idLeadHours != null && (
              <p>ID Lead Time: {property.idLeadHours}h before check-in</p>
            )}
            <p>3rd Party Allowed: <span className="font-medium">{property.thirdPartyAllowed ? "Yes" : "No"}</span></p>
            {property.thermostatDefault && (
              <p className="flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5" /> Thermostat Default: {property.thermostatDefault}
              </p>
            )}
            {property.securityNote && (
              <div className="mt-2"><p className="text-muted-foreground text-xs">Security Note</p><p>{property.securityNote}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </>
  );
}
