import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GuideLayout } from "@/components/guest/guide-layout";
import { HeroSection } from "@/components/guest/hero-section";
import type { Metadata } from "next";

const getProperty = cache(async (slug: string) => {
  return db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    with: { owner: true },
  });
});

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await getProperty(params.slug);
  if (!property) return { title: "Not Found" };
  return {
    title: `${property.name} — Guest Guide`,
    description: property.description ?? `Guest guide for ${property.name}`,
    openGraph: {
      title: property.name,
      description: property.description ?? `Guest guide for ${property.name}`,
    },
  };
}

export default async function GuestGuidePage({ params }: Props) {
  const property = await getProperty(params.slug);
  if (!property || !property.active) notFound();

  return (
    <GuideLayout>
      <HeroSection
        name={property.name}
        description={property.description}
        city={property.addressCity}
      />
      <div className="px-5 py-6 space-y-5">
        {/* Remaining sections will be added in Tasks 8-9 */}
        <p className="text-center text-slate-400 text-sm">More sections coming soon...</p>
      </div>
    </GuideLayout>
  );
}
