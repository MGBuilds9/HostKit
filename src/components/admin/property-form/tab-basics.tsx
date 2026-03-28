"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyBasicsSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type BasicsFormValues = z.input<typeof propertyBasicsSchema>;

interface TabBasicsProps {
  initialData: Record<string, unknown>;
  owners: { id: string; name: string }[];
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
}

export function TabBasics({ initialData, owners, onSave, saving }: TabBasicsProps) {
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } =
    useForm<BasicsFormValues>({
      resolver: zodResolver(propertyBasicsSchema),
      defaultValues: {
        name: (initialData.name as string) ?? "",
        slug: (initialData.slug as string) ?? "",
        description: (initialData.description as string) ?? "",
        ownerId: (initialData.ownerId as string) ?? "",
        addressStreet: (initialData.addressStreet as string) ?? "",
        addressUnit: (initialData.addressUnit as string) ?? "",
        addressCity: (initialData.addressCity as string) ?? "",
        addressProvince: (initialData.addressProvince as string) ?? "",
        addressPostal: (initialData.addressPostal as string) ?? "",
        addressCountry: (initialData.addressCountry as string) ?? "Canada",
        latitude: (initialData.latitude as string) ?? "",
        longitude: (initialData.longitude as string) ?? "",
        floor: (initialData.floor as string) ?? "",
        layout: (initialData.layout as string) ?? "",
        beds: (initialData.beds as BasicsFormValues["beds"]) ?? [],
      },
    });

  const { fields: bedFields, append: appendBed, remove: removeBed } = useFieldArray({ control, name: "beds" });
  const nameValue = watch("name");
  const slugPreview = nameValue
    ? nameValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "";

  return (
    <form onSubmit={handleSubmit((v) => onSave(v as Record<string, unknown>))} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="name">Property Name *</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Kith 1423" />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        {slugPreview && <p className="text-xs text-muted-foreground">Slug: <span className="font-mono">{slugPreview}</span></p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="slug">Slug (optional override)</Label>
        <Input id="slug" {...register("slug")} placeholder="auto-generated from name" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} placeholder="Short tagline for guest guide" rows={2} />
      </div>
      <div className="space-y-1">
        <Label>Owner *</Label>
        <Select defaultValue={(initialData.ownerId as string) ?? ""} onValueChange={(val) => setValue("ownerId", val)}>
          <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
          <SelectContent>{owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        {errors.ownerId && <p className="text-xs text-red-500">{errors.ownerId.message}</p>}
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1"><Label>Street *</Label><Input {...register("addressStreet")} placeholder="123 Main St" />{errors.addressStreet && <p className="text-xs text-red-500">{errors.addressStreet.message}</p>}</div>
          <div className="space-y-1"><Label>Unit</Label><Input {...register("addressUnit")} placeholder="Suite 4B" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>City *</Label><Input {...register("addressCity")} placeholder="Toronto" />{errors.addressCity && <p className="text-xs text-red-500">{errors.addressCity.message}</p>}</div>
          <div className="space-y-1"><Label>Province *</Label><Input {...register("addressProvince")} placeholder="ON" />{errors.addressProvince && <p className="text-xs text-red-500">{errors.addressProvince.message}</p>}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Postal Code *</Label><Input {...register("addressPostal")} placeholder="M5V 3A8" />{errors.addressPostal && <p className="text-xs text-red-500">{errors.addressPostal.message}</p>}</div>
          <div className="space-y-1"><Label>Country</Label><Input {...register("addressCountry")} placeholder="Canada" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Latitude</Label><Input {...register("latitude")} placeholder="43.6532" /></div>
          <div className="space-y-1"><Label>Longitude</Label><Input {...register("longitude")} placeholder="-79.3832" /></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Floor</Label><Input {...register("floor")} placeholder="12" /></div>
        <div className="space-y-1"><Label>Layout</Label><Input {...register("layout")} placeholder="2BR / 2BA" /></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Beds</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => appendBed({ type: "queen", count: 1, location: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add Bed
          </Button>
        </div>
        {bedFields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-7 gap-2 items-end">
            <div className="col-span-2 space-y-1"><Label>Type</Label><Input {...register(`beds.${index}.type`)} placeholder="queen" /></div>
            <div className="col-span-1 space-y-1"><Label>Count</Label><Input type="number" min={1} {...register(`beds.${index}.count`, { valueAsNumber: true })} /></div>
            <div className="col-span-3 space-y-1"><Label>Location</Label><Input {...register(`beds.${index}.location`)} placeholder="Primary Bedroom" /></div>
            <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => removeBed(index)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Basics"}</Button>
      </div>
    </form>
  );
}
