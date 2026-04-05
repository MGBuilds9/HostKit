import { MetadataRoute } from "next";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hostkit.mkgbuilds.com";
  const allProperties = await db.select({ slug: properties.slug })
    .from(properties)
    .where(eq(properties.active, true));

  return allProperties.map((p) => ({
    url: `${baseUrl}/g/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
  }));
}
