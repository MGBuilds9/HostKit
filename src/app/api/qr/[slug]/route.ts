import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, params.slug),
  });

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const type = request.nextUrl.searchParams.get("type");

  let data: string;
  if (type === "wifi" && property.wifiName && property.wifiPassword) {
    data = `WIFI:T:WPA;S:${property.wifiName};P:${property.wifiPassword};;`;
  } else {
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://hostkit.mkgbuilds.com";
    data = `${baseUrl}/g/${property.slug}`;
  }

  const buffer = await QRCode.toBuffer(data, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
