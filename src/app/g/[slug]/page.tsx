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
import {
  computeGuideSectionAvailability,
  resolveBandColumnClasses,
} from "@/lib/guide-utils";
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
    title: "Motorized blinds",
    description:
      "Use the handheld remote in the bedroom: press Up to raise, the center Stop button to pause at any height, and Down to lower the blackout roller shades.",
    icon: "blinds",
    mediaUrl: "/guide-media/kith-1423/assets/blinds-remote.mp4",
    mediaType: "video",
    posterUrl: "/guide-media/kith-1423/posters/blinds-remote.jpg",
  },
  {
    step: 2,
    title: "14th-floor chute",
    description:
      "From Unit 1423, walk down the 14th-floor hallway past the elevators to the disposal room. Use the selector buttons on the chute panel for Garbage, Recycling, or Organics (8:00 AM – 10:00 PM only).",
    icon: "trash-2",
    mediaUrl: "/guide-media/kith-1423/assets/hallway-to-unit.mp4",
    mediaType: "video",
    posterUrl: "/guide-media/kith-1423/posters/hallway-to-unit.jpg",
  },
  {
    step: 3,
    title: "Ground bulk waste",
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
  // screen without dead section links until the guest unlocks the guide.
  const accessCode = property.guestAccessCode;
  if (accessCode) {
    const { slug } = property;
    const unlocked = await isGuideUnlocked(slug, accessCode);
    if (!unlocked) {
      return (
        <GuideLayout showNav={false}>
          <GuideUnlockForm propertyName={property.name} slug={slug} />
        </GuideLayout>
      );
    }
  }

  const availability = computeGuideSectionAvailability({
    checkinSteps: property.checkinSteps,
    wifiName: property.wifiName,
    wifiPassword: property.wifiPassword,
    parkingSpot: property.parkingSpot,
    parkingInstructions: property.parkingInstructions,
    hasStayGuides: property.slug === "kith-1423",
    houseRules: property.houseRules,
    securityNote: property.securityNote,
    kitchenAmenities: property.kitchenAmenities as string[] | null,
    bathroomAmenities: property.bathroomAmenities as string[] | null,
    generalAmenities: property.generalAmenities as string[] | null,
    checkoutSteps: property.checkoutSteps,
    nearbyServices: property.nearbyServices,
    hostPhone: property.hostPhone,
    ownerPhone: property.ownerPhone,
    emergencyContact: property.emergencyContact,
  });

  const sectionIds = [
    availability.arrival ? "arrival" : null,
    availability.wifi ? "wifi" : null,
    availability.parking ? "parking" : null,
    availability.stayGuides ? "stay-guides" : null,
    availability.rules ? "rules" : null,
    availability.included ? "included" : null,
    availability.checkout ? "checkout" : null,
    availability.nearby ? "nearby" : null,
    availability.emergency ? "emergency" : null,
  ].filter((id): id is string => id !== null);

  // Ensure Tailwind scans all responsive 12-column span classes in src/app/
  const _tailwindGridSpanSafelist = [
    "lg:col-span-7",
    "lg:col-span-5",
    "lg:col-span-12",
  ];
  void _tailwindGridSpanSafelist;

  const hasBand1Left = availability.arrival;
  const hasBand1Right = availability.wifi || availability.parking;
  const hasBand1 = hasBand1Left || hasBand1Right;
  const band1Cols = resolveBandColumnClasses(hasBand1Left, hasBand1Right);

  const hasBand2Left =
    availability.stayGuides || availability.rules || availability.included;
  const hasBand2Right =
    availability.checkout || availability.nearby || availability.emergency;
  const hasBand2 = hasBand2Left || hasBand2Right;
  const band2Cols = resolveBandColumnClasses(hasBand2Left, hasBand2Right);

  const arrivalTarget = property.addressUnit
    ? `Unit ${property.addressUnit}`
    : property.name;

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
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: property.latitude,
            longitude: property.longitude,
          },
        }
      : {}),
    url: `${baseUrl}/g/${property.slug}`,
  };

  return (
    <GuideLayout sectionIds={sectionIds}>
      {/* JSON-LD: server-only DB data, no user-supplied HTML */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="pb-28 md:pb-12">
        <HeroSection
          name={property.name}
          description={property.description}
          city={property.addressCity}
          province={property.addressProvince}
          postalCode={property.addressPostal}
          unit={property.addressUnit}
          floor={property.floor}
          layout={property.layout}
          checkinTime={property.checkinTime}
          checkoutTime={property.checkoutTime}
          wifiName={property.wifiName}
          wifiPassword={property.wifiPassword}
          buzzerName={property.buzzerName}
          parkingSpot={property.parkingSpot}
          addressLine={property.addressStreet}
          latitude={property.latitude}
          longitude={property.longitude}
          hasArrival={availability.arrival}
          hasWifi={availability.wifi}
          hasParking={availability.parking}
          hostPhone={property.hostPhone ?? null}
          emergencyContact={property.emergencyContact ?? null}
        />

        <div className="px-4 sm:px-8">
          {/* Band 1: Asymmetric 12-col grid (lg:col-span-7 + lg:col-span-5 when both sides present; expands lone side) */}
          {hasBand1 && (
            <div
              className="space-y-8 border-t pt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 lg:space-y-0"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              {band1Cols.leftClass && availability.arrival && property.checkinSteps && (
                <div className={`min-w-0 space-y-8 ${band1Cols.leftClass}`}>
                  <section id="arrival" className="scroll-mt-24">
                    <CheckinWalkthrough
                      steps={property.checkinSteps as Step[]}
                      subtitle={`Follow each step in order from driveway arrival to ${arrivalTarget}.`}
                      storageKey={`hostkit_completed_steps_${property.slug}_v2`}
                    />
                  </section>
                </div>
              )}

              {band1Cols.rightClass && hasBand1Right && (
                <div
                  className={`min-w-0 space-y-8 ${
                    hasBand1Left ? "lg:sticky lg:top-20 lg:z-10" : ""
                  } ${band1Cols.rightClass}`}
                >
                  {availability.wifi && property.wifiName && property.wifiPassword && (
                    <section id="wifi" className="scroll-mt-24">
                      <WifiCard
                        name={property.wifiName}
                        password={property.wifiPassword}
                      />
                    </section>
                  )}

                  {availability.parking && (
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
                  )}
                </div>
              )}
            </div>
          )}

          {/* Band 2: In-stay guides, house rules & amenities + check-out, local & emergency */}
          {hasBand2 && (
            <div
              className={`${
                hasBand1 ? "mt-10 pt-10" : "pt-8"
              } space-y-8 border-t lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 lg:space-y-0`}
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              {band2Cols.leftClass && hasBand2Left && (
                <div className={`min-w-0 space-y-8 ${band2Cols.leftClass}`}>
                  {availability.stayGuides && (
                    <section id="stay-guides" className="scroll-mt-24">
                      <CheckinWalkthrough
                        heading="During Your Stay — Video Guides"
                        subtitle="Quick visual walkthroughs for the motorized blinds and waste rooms."
                        steps={KITH_1423_STAY_GUIDES}
                        completable={false}
                        defaultOpenFirst={false}
                      />
                    </section>
                  )}

                  {availability.rules && (
                    <section id="rules" className="scroll-mt-24">
                      <HouseRulesSection
                        rules={property.houseRules ?? []}
                        securityNote={property.securityNote ?? null}
                      />
                    </section>
                  )}

                  {availability.included && (
                    <section id="included" className="scroll-mt-24">
                      <AmenitiesSection
                        kitchen={property.kitchenAmenities as string[] | null}
                        bathroom={property.bathroomAmenities as string[] | null}
                        general={property.generalAmenities as string[] | null}
                      />
                    </section>
                  )}
                </div>
              )}

              {band2Cols.rightClass && hasBand2Right && (
                <div className={`min-w-0 space-y-8 ${band2Cols.rightClass}`}>
                  {availability.checkout && property.checkoutSteps && (
                    <section id="checkout" className="scroll-mt-24">
                      <CheckoutSection
                        steps={property.checkoutSteps}
                        time={property.checkoutTime}
                      />
                    </section>
                  )}

                  {availability.nearby && property.nearbyServices && (
                    <section id="nearby" className="scroll-mt-24">
                      <NearbyServices
                        services={property.nearbyServices as Service[]}
                      />
                    </section>
                  )}

                  {availability.emergency && (
                    <section id="emergency" className="scroll-mt-24">
                      <EmergencyContacts
                        emergency={property.emergencyContact ?? null}
                        hostPhone={property.hostPhone ?? null}
                        ownerPhone={property.ownerPhone ?? null}
                      />
                    </section>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Hallmark Ft2 · Inline-rule single line footer */}
          <footer
            className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs"
            style={{
              borderColor: "var(--guest-card-border)",
              color: "var(--guest-text-muted)",
            }}
          >
            <span>
              {property.name} · {property.addressCity}
            </span>
            <a
              href="#guide-top"
              className="guest-hover-row inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-2 font-medium underline-offset-4 hover:underline"
              style={{ color: "var(--guest-text)" }}
            >
              Back to top ↑
            </a>
          </footer>
        </div>
      </main>

      <StickyBottomBar
        hostPhone={property.hostPhone ?? null}
        emergency={property.emergencyContact ?? null}
      />
    </GuideLayout>
  );
}
