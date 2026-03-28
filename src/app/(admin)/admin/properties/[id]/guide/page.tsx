import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Download, QrCode, Wifi } from "lucide-react";
import { PrintButton } from "./print-button";

export default async function GuidePreviewPage({ params }: { params: { id: string } }) {
  await requireAuth();

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const guideUrl = `${baseUrl}/g/${property.slug}`;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Guest Guide Preview</h1>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={guideUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Guide
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/qr/${property.slug}?download=1`} download={`${property.slug}-qr.png`}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download QR
            </a>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Guide iframe preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-lg">
          <iframe
            src={guideUrl}
            title={`${property.name} guest guide preview`}
            className="w-full border-0"
            style={{ height: "700px" }}
          />
        </CardContent>
      </Card>

      {/* QR Codes — compact below preview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${property.slug}`}
              alt={`QR code linking to ${property.name} guest guide`}
              className="h-24 w-24 border rounded shrink-0"
            />
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> Guest Guide QR
              </p>
              <p className="text-xs text-muted-foreground mt-1 break-all">/g/{property.slug}</p>
            </div>
          </CardContent>
        </Card>

        {property.wifiName && property.wifiPassword && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr/${property.slug}?type=wifi`}
                alt={`QR code for WiFi network ${property.wifiName}`}
                className="h-24 w-24 border rounded shrink-0"
              />
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5" /> WiFi QR
                </p>
                <p className="text-xs font-medium mt-1">{property.wifiName}</p>
                <p className="text-xs text-muted-foreground font-mono">{property.wifiPassword}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
