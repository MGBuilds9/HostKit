"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";

interface OwnerPropertyCardProps {
  id: string;
  name: string;
  addressStreet: string;
  addressCity: string;
  layout: string | null;
  active: boolean | null;
  upcomingStayCount: number;
}

export function OwnerPropertyCard({
  id,
  name,
  addressStreet,
  addressCity,
  layout,
  active,
  upcomingStayCount,
}: OwnerPropertyCardProps) {
  return (
    <Link href={`/owner/properties/${id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-base">{name}</p>
              <p className="text-sm text-muted-foreground">
                {addressStreet}, {addressCity}
                {layout && ` \u00b7 ${layout}`}
              </p>
            </div>
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {upcomingStayCount} upcoming{" "}
              {upcomingStayCount === 1 ? "stay" : "stays"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
