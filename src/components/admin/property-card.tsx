"use client";

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
    <Card className="group relative flex flex-col transition-shadow duration-200 ease-out hover:shadow-md hover:-translate-y-px">
      {/* Stretched primary link — keeps the whole card clickable without nesting anchors */}
      <Link
        href={`/admin/properties/${id}`}
        aria-label={`View ${name}`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-base truncate transition-colors group-hover:text-foreground">
              {name}
            </p>
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
      <CardContent className="mt-auto">
        {/* Action links sit above the stretched link */}
        <div className="relative z-10 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-10 md:flex-none md:h-8" asChild>
            <Link href={`/admin/properties/${id}/guide`}>
              <QrCode className="h-4 w-4 md:h-3 md:w-3 mr-1" /> Guide
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-10 md:flex-none md:h-8" asChild>
            <Link href={`/admin/properties/${id}/messages`}>
              <MessageSquare className="h-4 w-4 md:h-3 md:w-3 mr-1" /> Messages
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-10 md:flex-none md:h-8" asChild>
            <Link href={`/admin/properties/${id}/checklist`}>
              <ClipboardCheck className="h-4 w-4 md:h-3 md:w-3 mr-1" /> Turnover
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
