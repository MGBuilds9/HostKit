"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyNearbySchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { NearbyServiceCard } from "./nearby-service-card";

type NearbyFormValues = z.input<typeof propertyNearbySchema>;

interface TabNearbyProps {
  initialData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
}

export function TabNearby({ initialData, onSave, saving }: TabNearbyProps) {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } =
    useForm<NearbyFormValues>({
      resolver: zodResolver(propertyNearbySchema),
      defaultValues: {
        nearbyServices: (initialData.nearbyServices as NearbyFormValues["nearbyServices"]) ?? [],
        emergencyContact: (initialData.emergencyContact as string) ?? "",
        hostPhone: (initialData.hostPhone as string) ?? "",
        ownerPhone: (initialData.ownerPhone as string) ?? "",
        thermostatDefault: (initialData.thermostatDefault as string) ?? "22°C",
      },
    });

  const { fields: serviceFields, append: appendService, remove: removeService } =
    useFieldArray({ control, name: "nearbyServices" });

  const nearbyServices = watch("nearbyServices");

  return (
    <form onSubmit={handleSubmit((v) => onSave(v as Record<string, unknown>))} className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Nearby Services</h3>
          <Button type="button" variant="outline" size="sm"
            onClick={() => appendService({ name: "", category: "other", address: "", distance: "", googleMapsUrl: "", phone: "", notes: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
        </div>
        {serviceFields.map((field, index) => (
          <NearbyServiceCard
            key={field.id}
            index={index}
            register={register}
            setValue={setValue}
            currentCategory={(nearbyServices?.[index]?.category as string) ?? "other"}
            onRemove={() => removeService(index)}
            errors={(errors.nearbyServices as unknown as Record<number, unknown>)}
          />
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Emergency &amp; Contacts</h3>
        <div className="space-y-1">
          <Label htmlFor="emergencyContact">Emergency Contact</Label>
          <Input id="emergencyContact" {...register("emergencyContact")} placeholder="911 / Building Security: 416-555-0911" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label htmlFor="hostPhone">Host Phone</Label><Input id="hostPhone" {...register("hostPhone")} placeholder="+1 416 555 0101" /></div>
          <div className="space-y-1"><Label htmlFor="ownerPhone">Owner Phone</Label><Input id="ownerPhone" {...register("ownerPhone")} placeholder="+1 416 555 0102" /></div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="thermostatDefault">Thermostat Default</Label>
          <Input id="thermostatDefault" {...register("thermostatDefault")} placeholder="22°C" className="w-32" />
        </div>
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Nearby"}</Button>
      </div>
    </form>
  );
}
