import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GuideLayout } from "@/components/guest/guide-layout";
import { HeroSection } from "@/components/guest/hero-section";
import { CheckinWalkthrough } from "@/components/guest/checkin-walkthrough";
import { WifiCard } from "@/components/guest/wifi-card";
import { ParkingCard } from "@/components/guest/parking-card";
import { HouseRulesSection } from "@/components/guest/house-rules-section";
import { AmenitiesSection } from "@/components/guest/amenities-section";
import { NearbyServices } from "@/components/guest/nearby-services";
import { CheckoutSection } from "@/components/guest/checkout-section";
import { EmergencyContacts } from "@/components/guest/emergency-contacts";
import { StickyBottomBar } from "@/components/guest/sticky-bottom-bar";
import { GuideUnlockForm } from "@/components/guest/guide-unlock-form";
import { isGuideUnlocked } from "@/lib/guest-access";
import type { Metadata } from "next";

export const revalidate = 0;

type Step = {
  step: number;
  title: string;
  description: string;
  icon?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  posterUrl?: string;
};

type Service = {
  name: string;
  category: string;
  address?: string;
  distance?: string;
  googleMapsUrl?: string;
  phone?: string;
  notes?: string;
};

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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hostkit.mkgbuilds.com";
  const canonical = `${baseUrl}/g/${property.slug}`;
  return {
    title: `${property.name} — Guest Guide`,
    description: property.description ?? `Guest guide for ${property.name}`,
    alternates: { canonical },
    openGraph: {
      title: property.name,
      description: property.description ?? `Guest guide for ${property.name}`,
      url: canonical,
    },
  };
}

export default async function GuestGuidePage({ params }: Props) {
  const property = await getProperty(params.slug);
  if (!property || !property.active) notFound();

  // Access-code gate: a property with guestAccessCode set shows an unlock
  // screen until a guest provides the correct code (then a cookie is set).
  const accessCode = property.guestAccessCode;
  if (accessCode) {
    const { slug } = property;
    const unlocked = await isGuideUnlocked(slug, accessCode);
    if (!unlocked) {
      return (
        <GuideLayout>
          <GuideUnlockForm propertyName={property.name} slug={slug} />
        </GuideLayout>
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hostkit.mkgbuilds.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.addressStreet,
      addressLocality: property.addressCity,
      addressRegion: property.addressProvince,
      postalCode: property.addressPostal,
      addressCountry: property.addressCountry,
    },
    ...(property.latitude && property.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: property.latitude, longitude: property.longitude } }
      : {}),
    url: `${baseUrl}/g/${property.slug}`,
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <GuideLayout>
      {/* JSON-LD: server-only DB data, no user-supplied HTML */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroSection
        name={property.name}
        description={property.description}
        city={property.addressCity}
        checkinTime={property.checkinTime}
        checkoutTime={property.checkoutTime}
        wifiName={property.wifiName}
        parkingSpot={property.parkingSpot}
      />
      <div className="px-5 sm:px-0">
        <div className="py-8 space-y-8 pb-24 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          {/* Left column */}
          <div className="space-y-8">
            {property.checkinSteps && property.checkinSteps.length > 0 && (
              <CheckinWalkthrough steps={property.checkinSteps as Step[]} />
            )}

            {property.wifiName && property.wifiPassword && (
              <WifiCard name={property.wifiName} password={property.wifiPassword} />
            )}

            <ParkingCard
              spot={property.parkingSpot}
              instructions={property.parkingInstructions}
              latitude={property.latitude}
              longitude={property.longitude}
            />
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {property.houseRules && property.houseRules.length > 0 && (
              <HouseRulesSection
                rules={property.houseRules}
                securityNote={property.securityNote ?? null}
              />
            )}

            <AmenitiesSection
              kitchen={property.kitchenAmenities as string[] | null}
              bathroom={property.bathroomAmenities as string[] | null}
              general={property.generalAmenities as string[] | null}
            />

            {property.nearbyServices && property.nearbyServices.length > 0 && (
              <NearbyServices services={property.nearbyServices as Service[]} />
            )}

            {property.checkoutSteps && property.checkoutSteps.length > 0 && (
              <CheckoutSection
                steps={property.checkoutSteps}
                time={property.checkoutTime}
              />
            )}
          </div>
        </div>

        {/* Full-width sections */}
        <div className="space-y-8 pb-24">
          <EmergencyContacts
            emergency={property.emergencyContact ?? null}
            hostPhone={property.hostPhone ?? null}
            ownerPhone={property.ownerPhone ?? null}
          />
        </div>
      </div>

      <StickyBottomBar
        hostPhone={property.hostPhone ?? null}
        emergency={property.emergencyContact ?? null}
      />
    </GuideLayout>
  );
}
