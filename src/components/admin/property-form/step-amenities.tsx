"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyAmenitiesSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, X } from "lucide-react";

// Use z.input to get the form-facing type (before defaults are applied)
type AmenitiesFormValues = z.input<typeof propertyAmenitiesSchema>;

interface StepAmenitiesProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
      }
      setInputValue("");
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-muted-foreground hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type and press Enter to add..."
      />
    </div>
  );
}

export function StepAmenities({ data, onNext, onBack }: StepAmenitiesProps) {
  const [kitchenTags, setKitchenTags] = useState<string[]>(
    (data.kitchenAmenities as string[]) ?? []
  );
  const [bathroomTags, setBathroomTags] = useState<string[]>(
    (data.bathroomAmenities as string[]) ?? []
  );
  const [generalTags, setGeneralTags] = useState<string[]>(
    (data.generalAmenities as string[]) ?? []
  );

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<AmenitiesFormValues>({
    resolver: zodResolver(propertyAmenitiesSchema),
    defaultValues: {
      kitchenAmenities: (data.kitchenAmenities as string[]) ?? [],
      bathroomAmenities: (data.bathroomAmenities as string[]) ?? [],
      generalAmenities: (data.generalAmenities as string[]) ?? [],
      houseRules: (data.houseRules as AmenitiesFormValues["houseRules"]) ?? [],
      idRequired: (data.idRequired as boolean) ?? true,
      idLeadHours: (data.idLeadHours as number) ?? 72,
      thirdPartyAllowed: (data.thirdPartyAllowed as boolean) ?? false,
    },
  });

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({ control, name: "houseRules" });

  const idRequired = watch("idRequired");

  function onSubmit(values: AmenitiesFormValues) {
    // Merge tag arrays into form values
    const result = {
      ...values,
      kitchenAmenities: kitchenTags,
      bathroomAmenities: bathroomTags,
      generalAmenities: generalTags,
    };
    onNext(result as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Kitchen Amenities */}
      <TagInput
        label="Kitchen Amenities"
        tags={kitchenTags}
        onAdd={(tag) => setKitchenTags((prev) => [...prev, tag])}
        onRemove={(i) => setKitchenTags((prev) => prev.filter((_, idx) => idx !== i))}
      />

      {/* Bathroom Amenities */}
      <TagInput
        label="Bathroom Amenities"
        tags={bathroomTags}
        onAdd={(tag) => setBathroomTags((prev) => [...prev, tag])}
        onRemove={(i) => setBathroomTags((prev) => prev.filter((_, idx) => idx !== i))}
      />

      {/* General Amenities */}
      <TagInput
        label="General Amenities"
        tags={generalTags}
        onAdd={(tag) => setGeneralTags((prev) => [...prev, tag])}
        onRemove={(i) => setGeneralTags((prev) => prev.filter((_, idx) => idx !== i))}
      />

      {/* House Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">House Rules</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendRule({ rule: "", icon: "" })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>
        {ruleFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center">
            <div className="w-16">
              <Input {...register(`houseRules.${index}.icon`)} placeholder="🚭" />
            </div>
            <div className="flex-1">
              <Input {...register(`houseRules.${index}.rule`)} placeholder="No smoking anywhere on premises" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => removeRule(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Policies */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Policies</h3>

        <div className="flex items-center gap-3">
          <input
            id="idRequired"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register("idRequired")}
          />
          <Label htmlFor="idRequired">ID Verification Required</Label>
        </div>

        {idRequired && (
          <div className="space-y-1 ml-7">
            <Label htmlFor="idLeadHours">ID Submission Lead Time (hours)</Label>
            <Input
              id="idLeadHours"
              type="number"
              className="w-32"
              {...register("idLeadHours", { valueAsNumber: true })}
            />
            {errors.idLeadHours && <p className="text-xs text-red-500">{errors.idLeadHours.message}</p>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            id="thirdPartyAllowed"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register("thirdPartyAllowed")}
          />
          <Label htmlFor="thirdPartyAllowed">Third-Party Bookings Allowed</Label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Nearby & Emergency</Button>
      </div>
    </form>
  );
}
