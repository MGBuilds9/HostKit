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
      {/* Step indicator bar */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 text-center text-xs py-2 rounded ${
              i === step
                ? "bg-slate-900 text-white"
                : i < step
                ? "bg-slate-200 text-slate-700"
                : "bg-slate-100 text-slate-400"
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
