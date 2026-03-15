"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyBasicsSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// Use z.input to get the form-facing type (before defaults are applied)
type BasicsFormValues = z.input<typeof propertyBasicsSchema>;

interface StepBasicsProps {
  data: Record<string, unknown>;
  owners: { id: string; name: string }[];
  onNext: (data: Record<string, unknown>) => void;
}

export function StepBasics({ data, owners, onNext }: StepBasicsProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<BasicsFormValues>({
    resolver: zodResolver(propertyBasicsSchema),
    defaultValues: {
      name: (data.name as string) ?? "",
      slug: (data.slug as string) ?? "",
      description: (data.description as string) ?? "",
      ownerId: (data.ownerId as string) ?? "",
      addressStreet: (data.addressStreet as string) ?? "",
      addressUnit: (data.addressUnit as string) ?? "",
      addressCity: (data.addressCity as string) ?? "",
      addressProvince: (data.addressProvince as string) ?? "",
      addressPostal: (data.addressPostal as string) ?? "",
      addressCountry: (data.addressCountry as string) ?? "Canada",
      latitude: (data.latitude as string) ?? "",
      longitude: (data.longitude as string) ?? "",
      floor: (data.floor as string) ?? "",
      layout: (data.layout as string) ?? "",
      beds: (data.beds as BasicsFormValues["beds"]) ?? [],
    },
  });

  const { fields: bedFields, append: appendBed, remove: removeBed } = useFieldArray({
    control,
    name: "beds",
  });

  const nameValue = watch("name");

  // Auto-generate slug preview from name
  const slugPreview = nameValue
    ? nameValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "";

  function onSubmit(values: BasicsFormValues) {
    onNext(values as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Property Name */}
      <div className="space-y-1">
        <Label htmlFor="name">Property Name *</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Kith 1423" />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        {slugPreview && (
          <p className="text-xs text-slate-400">Slug: <span className="font-mono">{slugPreview}</span></p>
        )}
      </div>

      {/* Slug override */}
      <div className="space-y-1">
        <Label htmlFor="slug">Slug (optional override)</Label>
        <Input id="slug" {...register("slug")} placeholder="auto-generated from name" />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="Short tagline for guest guide" rows={2} />
      </div>

      {/* Owner */}
      <div className="space-y-1">
        <Label htmlFor="ownerId">Owner *</Label>
        <Select
          defaultValue={(data.ownerId as string) ?? ""}
          onValueChange={(val) => setValue("ownerId", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.ownerId && <p className="text-xs text-red-500">{errors.ownerId.message}</p>}
      </div>

      {/* Address */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-1 md:col-span-2 space-y-1">
            <Label htmlFor="addressStreet">Street *</Label>
            <Input id="addressStreet" {...register("addressStreet")} placeholder="123 Main St" />
            {errors.addressStreet && <p className="text-xs text-red-500">{errors.addressStreet.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="addressUnit">Unit</Label>
            <Input id="addressUnit" {...register("addressUnit")} placeholder="Suite 4B" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="addressCity">City *</Label>
            <Input id="addressCity" {...register("addressCity")} placeholder="Toronto" />
            {errors.addressCity && <p className="text-xs text-red-500">{errors.addressCity.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="addressProvince">Province *</Label>
            <Input id="addressProvince" {...register("addressProvince")} placeholder="ON" />
            {errors.addressProvince && <p className="text-xs text-red-500">{errors.addressProvince.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="addressPostal">Postal Code *</Label>
            <Input id="addressPostal" {...register("addressPostal")} placeholder="M5V 3A8" />
            {errors.addressPostal && <p className="text-xs text-red-500">{errors.addressPostal.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="addressCountry">Country</Label>
            <Input id="addressCountry" {...register("addressCountry")} placeholder="Canada" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" {...register("latitude")} placeholder="43.6532" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" {...register("longitude")} placeholder="-79.3832" />
          </div>
        </div>
      </div>

      {/* Floor & Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="floor">Floor</Label>
          <Input id="floor" {...register("floor")} placeholder="12" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="layout">Layout</Label>
          <Input id="layout" {...register("layout")} placeholder="2BR / 2BA" />
        </div>
      </div>

      {/* Beds */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Beds</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendBed({ type: "queen", count: 1, location: "" })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Bed
          </Button>
        </div>
        {bedFields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-7 gap-2 items-end">
            <div className="col-span-2 space-y-1">
              <Label>Type</Label>
              <Input {...register(`beds.${index}.type`)} placeholder="queen" />
            </div>
            <div className="col-span-1 space-y-1">
              <Label>Count</Label>
              <Input
                type="number"
                min={1}
                {...register(`beds.${index}.count`, { valueAsNumber: true })}
              />
            </div>
            <div className="col-span-3 space-y-1">
              <Label>Location</Label>
              <Input {...register(`beds.${index}.location`)} placeholder="Primary Bedroom" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => removeBed(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button type="submit">Next: Access & Check-In</Button>
      </div>
    </form>
  );
}
