import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ClipboardCheck, QrCode } from "lucide-react";

interface PropertyCardProps {
  id: string;
  name: string;
  slug: string;
  addressCity: string;
  layout: string | null;
  active: boolean;
  ownerName: string;
}

export function PropertyCard({ id, name, addressCity, layout, active, ownerName }: PropertyCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/admin/properties/${id}`} className="font-semibold hover:underline">
              {name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {addressCity}
              {layout && ` · ${layout}`}
            </p>
          </div>
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Owner: {ownerName}</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/guide`}>
              <QrCode className="h-3 w-3 mr-1" /> Guide
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/messages`}>
              <MessageSquare className="h-3 w-3 mr-1" /> Messages
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/checklist`}>
              <ClipboardCheck className="h-3 w-3 mr-1" /> Turnover
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
