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
import type { Metadata } from "next";

type Step = {
  step: number;
  title: string;
  description: string;
  icon?: string;
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
      <div className="py-6 space-y-5 pb-24">
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

        <EmergencyContacts
          emergency={property.emergencyContact ?? null}
          hostPhone={property.hostPhone ?? null}
          ownerPhone={property.ownerPhone ?? null}
        />
      </div>

      <StickyBottomBar
        hostPhone={property.hostPhone ?? null}
        emergency={property.emergencyContact ?? null}
      />
    </GuideLayout>
  );
}
