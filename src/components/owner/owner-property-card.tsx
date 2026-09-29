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
    <Link
      href={`/owner/properties/${id}`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="overflow-hidden rounded-lg border bg-card shadow-sm transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {addressStreet}, {addressCity}
                </span>
              </p>
            </div>
            <Badge variant={active ? "default" : "secondary"} className="shrink-0">
              {active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Stat strip — mirrors the Open Design "facts" row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
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
                <span className="h-4 w-px bg-border" aria-hidden />
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
