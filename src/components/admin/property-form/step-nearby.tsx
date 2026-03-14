"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyNearbySchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// Use z.input to get the form-facing type (before defaults are applied)
type NearbyFormValues = z.input<typeof propertyNearbySchema>;

const CATEGORY_OPTIONS = [
  { value: "grocery", label: "Grocery" },
  { value: "restaurant", label: "Restaurant" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "hospital", label: "Hospital" },
  { value: "transit", label: "Transit" },
  { value: "gas", label: "Gas Station" },
  { value: "gym", label: "Gym" },
  { value: "park", label: "Park" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

interface StepNearbyProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

export function StepNearby({ data, onNext, onBack }: StepNearbyProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NearbyFormValues>({
    resolver: zodResolver(propertyNearbySchema),
    defaultValues: {
      nearbyServices: (data.nearbyServices as NearbyFormValues["nearbyServices"]) ?? [],
      emergencyContact: (data.emergencyContact as string) ?? "",
      hostPhone: (data.hostPhone as string) ?? "",
      ownerPhone: (data.ownerPhone as string) ?? "",
      thermostatDefault: (data.thermostatDefault as string) ?? "22°C",
    },
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({ control, name: "nearbyServices" });

  const nearbyServices = watch("nearbyServices");

  function onSubmit(values: NearbyFormValues) {
    onNext(values as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Nearby Services */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Nearby Services</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendService({
                name: "",
                category: "other",
                address: "",
                distance: "",
                googleMapsUrl: "",
                phone: "",
                notes: "",
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
        </div>

        {serviceFields.map((field, index) => (
          <div key={field.id} className="border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Service {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 h-6 px-2"
                onClick={() => removeService(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input {...register(`nearbyServices.${index}.name`)} placeholder="Loblaws" />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  defaultValue={(nearbyServices?.[index]?.category as string) ?? "other"}
                  onValueChange={(val) =>
                    setValue(
                      `nearbyServices.${index}.category`,
                      val as NonNullable<NearbyFormValues["nearbyServices"]>[number]["category"]
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Address</Label>
                <Input {...register(`nearbyServices.${index}.address`)} placeholder="500 King St W" />
              </div>
              <div className="space-y-1">
                <Label>Distance</Label>
                <Input {...register(`nearbyServices.${index}.distance`)} placeholder="5 min walk" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input {...register(`nearbyServices.${index}.phone`)} placeholder="+1 416 555 0100" />
              </div>
              <div className="space-y-1">
                <Label>Google Maps URL</Label>
                <Input {...register(`nearbyServices.${index}.googleMapsUrl`)} placeholder="https://maps.google.com/..." />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(errors.nearbyServices as any)?.[index]?.googleMapsUrl && (
                  <p className="text-xs text-red-500">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(errors.nearbyServices as any)[index].googleMapsUrl?.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input {...register(`nearbyServices.${index}.notes`)} placeholder="Open 24h, good deli section" />
            </div>
          </div>
        ))}
      </div>

      {/* Emergency & Contact */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Emergency & Contacts</h3>

        <div className="space-y-1">
          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <Input
            id="emergencyContact"
            {...register("emergencyContact")}
            placeholder="911 / Building Security: 416-555-0911"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="hostPhone">Host Phone</Label>
            <Input
              id="hostPhone"
              {...register("hostPhone")}
              placeholder="+1 416 555 0101"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ownerPhone">Owner Phone</Label>
            <Input
              id="ownerPhone"
              {...register("ownerPhone")}
              placeholder="+1 416 555 0102"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="thermostatDefault">Thermostat Default</Label>
          <Input
            id="thermostatDefault"
            {...register("thermostatDefault")}
            placeholder="22°C"
            className="w-32"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Review</Button>
      </div>
    </form>
  );
}
