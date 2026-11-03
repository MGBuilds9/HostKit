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
  mediaType?: "image" | "video" | "";
  posterUrl?: string;
  playbackRate?: number;
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

const KITH_1423_STAY_GUIDES: Step[] = [
  {
    step: 1,
    title: "Bedroom Motorized Blinds",
    description:
      "Use the handheld remote in the bedroom: press Up to raise, the center Stop button to pause at any height, and Down to lower the blackout roller shades.",
    icon: "blinds",
    mediaUrl: "/guide-media/kith-1423/assets/blinds-remote.mp4",
    mediaType: "video",
    posterUrl: "/guide-media/kith-1423/posters/blinds-remote.jpg",
  },
  {
    step: 2,
    title: "14th-Floor Garbage & Recycling Chute",
    description:
      "From Unit 1423, walk down the 14th-floor hallway past the elevators to the disposal room. Use the selector buttons on the chute panel for Garbage, Recycling, or Organics (8:00 AM – 10:00 PM only).",
    icon: "trash-2",
    mediaUrl: "/guide-media/kith-1423/assets/hallway-to-unit.mp4",
    mediaType: "video",
    posterUrl: "/guide-media/kith-1423/posters/hallway-to-unit.jpg",
  },
  {
    step: 3,
    title: "Ground-Floor Bulk Waste / Moving Room",
    description:
      "For oversized bags or flattened cardboard boxes that do not fit the 14th-floor chute, take the elevator to Ground (1), tap your black fob through the service corridor, and use the Residential & Retail Moving Room bins.",
    icon: "package",
    mediaUrl: "/guide-media/kith-1423/assets/fob-and-garbage-room.mp4",
    mediaType: "video",
    posterUrl: "/guide-media/kith-1423/posters/fob-and-garbage-room.jpg",
  },
];

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
        addressLine={property.addressStreet}
      />
      <div className="px-5 sm:px-8">
        <div className="py-8 space-y-8 pb-24 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0">
          {/* Left column */}
          <div className="space-y-8">
            {property.checkinSteps && property.checkinSteps.length > 0 && (
              <section id="arrival" className="scroll-mt-24">
                <CheckinWalkthrough
                  steps={property.checkinSteps as Step[]}
                  storageKey={`hostkit_completed_steps_${property.slug}_v2`}
                />
              </section>
            )}

            {property.wifiName && property.wifiPassword && (
              <section id="wifi" className="scroll-mt-24">
                <WifiCard name={property.wifiName} password={property.wifiPassword} />
              </section>
            )}

            <section id="parking" className="scroll-mt-24">
              <ParkingCard
                spot={property.parkingSpot}
                instructions={property.parkingInstructions}
                latitude={property.latitude}
                longitude={property.longitude}
                imageUrl={
                  property.slug === "kith-1423"
                    ? "/guide-media/kith-1423/assets/parking-arrow.jpg"
                    : null
                }
              />
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-8">
            {property.houseRules && property.houseRules.length > 0 && (
              <section id="rules" className="scroll-mt-24">
                <HouseRulesSection
                  rules={property.houseRules}
                  securityNote={property.securityNote ?? null}
                />
              </section>
            )}

            <section id="included" className="scroll-mt-24">
              <AmenitiesSection
                kitchen={property.kitchenAmenities as string[] | null}
                bathroom={property.bathroomAmenities as string[] | null}
                general={property.generalAmenities as string[] | null}
              />
            </section>

            {property.slug === "kith-1423" && (
              <section id="stay-guides" className="scroll-mt-24">
                <CheckinWalkthrough
                  heading="During Your Stay — Video Guides"
                  steps={KITH_1423_STAY_GUIDES}
                  completable={false}
                  defaultOpenFirst={false}
                />
              </section>
            )}

            {property.nearbyServices && property.nearbyServices.length > 0 && (
              <section id="nearby" className="scroll-mt-24">
                <NearbyServices services={property.nearbyServices as Service[]} />
              </section>
            )}

            {property.checkoutSteps && property.checkoutSteps.length > 0 && (
              <section id="checkout" className="scroll-mt-24">
                <CheckoutSection
                  steps={property.checkoutSteps}
                  time={property.checkoutTime}
                />
              </section>
            )}
          </div>
        </div>

        {/* Full-width sections */}
        <div className="space-y-8 pb-24">
          <section id="emergency" className="scroll-mt-24">
            <EmergencyContacts
              emergency={property.emergencyContact ?? null}
              hostPhone={property.hostPhone ?? null}
              ownerPhone={property.ownerPhone ?? null}
            />
          </section>
        </div>
      </div>

      <StickyBottomBar
        hostPhone={property.hostPhone ?? null}
        emergency={property.emergencyContact ?? null}
      />
    </GuideLayout>
  );
}
