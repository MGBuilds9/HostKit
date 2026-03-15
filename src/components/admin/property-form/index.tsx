"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepBasics } from "./step-basics";
import { StepAccess } from "./step-access";
import { StepAmenities } from "./step-amenities";
import { StepNearby } from "./step-nearby";
import { StepReview } from "./step-review";

const STEPS = ["Basics", "Access & Check-In", "Amenities & Rules", "Nearby & Emergency", "Review"];

interface PropertyFormProps {
  owners: { id: string; name: string }[];
  initialData?: Record<string, unknown>;
  propertyId?: string;
}

export function PropertyForm({ owners, initialData, propertyId }: PropertyFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData ?? {});
  const [saving, setSaving] = useState(false);

  function updateData(stepData: Record<string, unknown>) {
    setFormData((prev) => ({ ...prev, ...stepData }));
  }

  async function handleSubmit() {
    setSaving(true);
    const url = propertyId ? `/api/properties/${propertyId}` : "/api/properties";
    const method = propertyId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push("/admin/properties");
      router.refresh();
    } else {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Mobile step indicator */}
      <div className="md:hidden mb-6 space-y-2">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      {/* Desktop step indicator */}
      <div className="hidden md:flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 text-center text-xs py-2 rounded ${
              i === step
                ? "bg-primary text-primary-foreground"
                : i < step
                ? "bg-muted text-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <StepBasics
          data={formData}
          owners={owners}
          onNext={(d) => {
            updateData(d);
            setStep(1);
          }}
        />
      )}
      {step === 1 && (
        <StepAccess
          data={formData}
          onNext={(d) => {
            updateData(d);
            setStep(2);
          }}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepAmenities
          data={formData}
          onNext={(d) => {
            updateData(d);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepNearby
          data={formData}
          onNext={(d) => {
            updateData(d);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <StepReview
          data={formData}
          onSubmit={handleSubmit}
          onBack={() => setStep(3)}
          saving={saving}
        />
      )}
    </div>
  );
}
