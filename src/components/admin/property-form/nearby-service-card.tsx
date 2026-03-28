"use client";

import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";

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

interface NearbyServiceCardProps {
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  currentCategory: string;
  onRemove: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors?: any;
}

export function NearbyServiceCard({ index, register, setValue, currentCategory, onRemove, errors }: NearbyServiceCardProps) {
  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Service {index + 1}</span>
        <Button type="button" variant="ghost" size="sm"
          className="text-red-500 hover:text-red-700 h-6 px-2" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input {...register(`nearbyServices.${index}.name`)} placeholder="Loblaws" />
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Select defaultValue={currentCategory ?? "other"}
            onValueChange={(val) => setValue(`nearbyServices.${index}.category`, val)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Address</Label>
          <Input {...register(`nearbyServices.${index}.address`)} placeholder="500 King St W" />
        </div>
        <div className="space-y-1">
          <Label>Distance</Label>
          <Input {...register(`nearbyServices.${index}.distance`)} placeholder="5 min walk" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input {...register(`nearbyServices.${index}.phone`)} placeholder="+1 416 555 0100" />
        </div>
        <div className="space-y-1">
          <Label>Google Maps URL</Label>
          <Input {...register(`nearbyServices.${index}.googleMapsUrl`)} placeholder="https://maps.google.com/..." />
          {errors?.[index]?.googleMapsUrl && (
            <p className="text-xs text-red-500">{errors[index].googleMapsUrl?.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Input {...register(`nearbyServices.${index}.notes`)} placeholder="Open 24h, good deli section" />
      </div>
    </div>
  );
}
