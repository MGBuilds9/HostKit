"use client";

import { Button } from "@/components/ui/button";

interface StepReviewProps {
  data: Record<string, unknown>;
  onSubmit: () => void;
  onBack: () => void;
  saving: boolean;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700 border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-500 min-w-[140px] shrink-0">{label}:</span>
      <span className="text-slate-800 break-all">
        {Array.isArray(value) ? (
          <span className="text-slate-600">{value.length} item(s)</span>
        ) : typeof value === "boolean" ? (
          value ? "Yes" : "No"
        ) : (
          String(value)
        )}
      </span>
    </div>
  );
}

function ArraySummary({ label, items, renderItem }: {
  label: string;
  items: unknown[] | undefined;
  renderItem: (item: unknown, i: number) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1">
      <span className="text-sm text-slate-500 font-medium">{label}:</span>
      <ul className="space-y-1 pl-3">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-700">
            {renderItem(item, i)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StepReview({ data, onSubmit, onBack, saving }: StepReviewProps) {
  const beds = data.beds as Array<{ type: string; count: number; location: string }> | undefined;
  const checkinSteps = data.checkinSteps as Array<{ step: number; title: string; description: string; icon?: string }> | undefined;
  const checkoutSteps = data.checkoutSteps as Array<{ step: number; title: string; description: string }> | undefined;
  const houseRules = data.houseRules as Array<{ rule: string; icon?: string }> | undefined;
  const kitchenAmenities = data.kitchenAmenities as string[] | undefined;
  const bathroomAmenities = data.bathroomAmenities as string[] | undefined;
  const generalAmenities = data.generalAmenities as string[] | undefined;
  const nearbyServices = data.nearbyServices as Array<{ name: string; category: string; address?: string; distance?: string }> | undefined;

  return (
    <div className="space-y-6">
      {/* Basics */}
      <Section title="Basics">
        <Field label="Name" value={data.name} />
        <Field label="Slug" value={data.slug} />
        <Field label="Description" value={data.description} />
        <Field label="Owner ID" value={data.ownerId} />
        <Field label="Address" value={[data.addressStreet, data.addressUnit, data.addressCity, data.addressProvince, data.addressPostal, data.addressCountry].filter(Boolean).join(", ")} />
        <Field label="Coordinates" value={data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : undefined} />
        <Field label="Floor" value={data.floor} />
        <Field label="Layout" value={data.layout} />
        <ArraySummary
          label="Beds"
          items={beds}
          renderItem={(item) => {
            const bed = item as { type: string; count: number; location: string };
            return `${bed.count}x ${bed.type} — ${bed.location}`;
          }}
        />
      </Section>

      {/* Access */}
      <Section title="Access & Check-In">
        <Field label="WiFi Name" value={data.wifiName} />
        <Field label="WiFi Password" value={data.wifiPassword} />
        <Field label="Parking Spot" value={data.parkingSpot} />
        <Field label="Parking Instructions" value={data.parkingInstructions} />
        <Field label="Buzzer Name" value={data.buzzerName} />
        <Field label="Buzzer Instructions" value={data.buzzerInstructions} />
        <Field label="Check-In Time" value={data.checkinTime} />
        <Field label="Check-Out Time" value={data.checkoutTime} />
        <Field label="Pre-Arrival Lead" value={data.preArrivalLeadMins ? `${data.preArrivalLeadMins} mins` : undefined} />
        <Field label="Security Note" value={data.securityNote} />
        <ArraySummary
          label="Check-In Steps"
          items={checkinSteps}
          renderItem={(item) => {
            const s = item as { step: number; title: string; icon?: string };
            return `${s.step}. ${s.icon ? s.icon + " " : ""}${s.title}`;
          }}
        />
        <ArraySummary
          label="Check-Out Steps"
          items={checkoutSteps}
          renderItem={(item) => {
            const s = item as { step: number; title: string };
            return `${s.step}. ${s.title}`;
          }}
        />
      </Section>

      {/* Amenities */}
      <Section title="Amenities & Rules">
        {kitchenAmenities && kitchenAmenities.length > 0 && (
          <Field label="Kitchen" value={kitchenAmenities.join(", ")} />
        )}
        {bathroomAmenities && bathroomAmenities.length > 0 && (
          <Field label="Bathroom" value={bathroomAmenities.join(", ")} />
        )}
        {generalAmenities && generalAmenities.length > 0 && (
          <Field label="General" value={generalAmenities.join(", ")} />
        )}
        <ArraySummary
          label="House Rules"
          items={houseRules}
          renderItem={(item) => {
            const r = item as { rule: string; icon?: string };
            return `${r.icon ? r.icon + " " : ""}${r.rule}`;
          }}
        />
        <Field label="ID Required" value={data.idRequired} />
        <Field label="ID Lead Hours" value={data.idLeadHours ? `${data.idLeadHours}h` : undefined} />
        <Field label="Third-Party Allowed" value={data.thirdPartyAllowed} />
      </Section>

      {/* Nearby */}
      <Section title="Nearby & Emergency">
        <ArraySummary
          label="Nearby Services"
          items={nearbyServices}
          renderItem={(item) => {
            const s = item as { name: string; category: string; distance?: string };
            return `${s.name} (${s.category})${s.distance ? " — " + s.distance : ""}`;
          }}
        />
        <Field label="Emergency Contact" value={data.emergencyContact} />
        <Field label="Host Phone" value={data.hostPhone} />
        <Field label="Owner Phone" value={data.ownerPhone} />
        <Field label="Thermostat Default" value={data.thermostatDefault} />
      </Section>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save & Publish"}
        </Button>
      </div>
    </div>
  );
}
