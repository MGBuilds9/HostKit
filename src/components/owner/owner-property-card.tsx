"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Bath, CalendarDays, MapPin } from "lucide-react";

interface OwnerPropertyCardProps {
  id: string;
  name: string;
  addressStreet: string;
  addressCity: string;
  layout: string | null;
  active: boolean | null;
  upcomingStayCount: number;
}

function parseLayout(layout: string | null): { beds: string; baths: string } | null {
  if (!layout) return null;
  const m = layout.match(/(\d+)\s*(?:BR|bed|bedroom)/i);
  const b = layout.match(/(\d+)\s*(?:BA|bath)/i);
  return { beds: m?.[1] ?? "", baths: b?.[1] ?? "" };
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
  const size = parseLayout(layout);

  return (
    <Link href={`/owner/properties/${id}`} className="block group">
      <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-base truncate">{name}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {addressStreet}, {addressCity}
                </span>
              </p>
            </div>
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Stat row (Jacob's Law: mirrors the bed/bath/area strip on listing cards) */}
          <div className="mt-4 flex items-center gap-5 text-sm text-muted-foreground">
            {size && (
              <>
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  {size.beds || "—"} BR
                </span>
                <span className="flex items-center gap-1.5">
                  <Bath className="h-4 w-4" />
                  {size.baths || "—"} BA
                </span>
                <span className="w-px h-4 bg-border" aria-hidden />
              </>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {upcomingStayCount} upcoming {upcomingStayCount === 1 ? "stay" : "stays"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
