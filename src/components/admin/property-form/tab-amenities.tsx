"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyAmenitiesSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { TagInput } from "./tag-input";

type AmenitiesFormValues = z.input<typeof propertyAmenitiesSchema>;

interface TabAmenitiesProps {
  initialData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
}

export function TabAmenities({ initialData, onSave, saving }: TabAmenitiesProps) {
  const [kitchenTags, setKitchenTags] = useState<string[]>((initialData.kitchenAmenities as string[]) ?? []);
  const [bathroomTags, setBathroomTags] = useState<string[]>((initialData.bathroomAmenities as string[]) ?? []);
  const [generalTags, setGeneralTags] = useState<string[]>((initialData.generalAmenities as string[]) ?? []);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<AmenitiesFormValues>({
    resolver: zodResolver(propertyAmenitiesSchema),
    defaultValues: {
      kitchenAmenities: (initialData.kitchenAmenities as string[]) ?? [],
      bathroomAmenities: (initialData.bathroomAmenities as string[]) ?? [],
      generalAmenities: (initialData.generalAmenities as string[]) ?? [],
      houseRules: (initialData.houseRules as AmenitiesFormValues["houseRules"]) ?? [],
      idRequired: (initialData.idRequired as boolean) ?? true,
      idLeadHours: (initialData.idLeadHours as number) ?? 72,
      thirdPartyAllowed: (initialData.thirdPartyAllowed as boolean) ?? false,
    },
  });

  const { fields: ruleFields, append: appendRule, remove: removeRule } =
    useFieldArray({ control, name: "houseRules" });

  const idRequired = watch("idRequired");

  function handleSubmitWithTags(values: AmenitiesFormValues) {
    return onSave({
      ...values,
      kitchenAmenities: kitchenTags,
      bathroomAmenities: bathroomTags,
      generalAmenities: generalTags,
    } as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitWithTags)} className="space-y-6">
      <TagInput label="Kitchen Amenities" tags={kitchenTags}
        onAdd={(tag) => setKitchenTags((p) => [...p, tag])}
        onRemove={(i) => setKitchenTags((p) => p.filter((_, idx) => idx !== i))} />
      <TagInput label="Bathroom Amenities" tags={bathroomTags}
        onAdd={(tag) => setBathroomTags((p) => [...p, tag])}
        onRemove={(i) => setBathroomTags((p) => p.filter((_, idx) => idx !== i))} />
      <TagInput label="General Amenities" tags={generalTags}
        onAdd={(tag) => setGeneralTags((p) => [...p, tag])}
        onRemove={(i) => setGeneralTags((p) => p.filter((_, idx) => idx !== i))} />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">House Rules</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => appendRule({ rule: "", icon: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>
        {ruleFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center">
            <div className="w-16"><Input {...register(`houseRules.${index}.icon`)} placeholder="🚭" /></div>
            <div className="flex-1"><Input {...register(`houseRules.${index}.rule`)} placeholder="No smoking anywhere on premises" /></div>
            <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeRule(index)} aria-label="Remove rule">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Policies</h3>
        <div className="flex items-center gap-3">
          <input id="idRequired" type="checkbox" className="h-4 w-4 rounded border-input" {...register("idRequired")} />
          <Label htmlFor="idRequired">ID Verification Required</Label>
        </div>
        {idRequired && (
          <div className="space-y-1 ml-7">
            <Label htmlFor="idLeadHours">ID Submission Lead Time (hours)</Label>
            <Input id="idLeadHours" type="number" className="w-32" {...register("idLeadHours", { valueAsNumber: true })} />
            {errors.idLeadHours && <p className="text-xs text-red-500">{errors.idLeadHours.message}</p>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input id="thirdPartyAllowed" type="checkbox" className="h-4 w-4 rounded border-input" {...register("thirdPartyAllowed")} />
          <Label htmlFor="thirdPartyAllowed">Third-Party Bookings Allowed</Label>
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Amenities"}</Button>
      </div>
    </form>
  );
}
