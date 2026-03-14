"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyAccessSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

// Use z.input to get the form-facing type (before defaults are applied)
type AccessFormValues = z.input<typeof propertyAccessSchema>;

interface StepAccessProps {
  data: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
}

export function StepAccess({ data, onNext, onBack }: StepAccessProps) {
  const {
    register,
    handleSubmit,
    control,
  } = useForm<AccessFormValues>({
    resolver: zodResolver(propertyAccessSchema),
    defaultValues: {
      wifiName: (data.wifiName as string) ?? "",
      wifiPassword: (data.wifiPassword as string) ?? "",
      parkingSpot: (data.parkingSpot as string) ?? "",
      parkingInstructions: (data.parkingInstructions as string) ?? "",
      buzzerName: (data.buzzerName as string) ?? "",
      buzzerInstructions: (data.buzzerInstructions as string) ?? "",
      checkinTime: (data.checkinTime as string) ?? "15:00",
      checkoutTime: (data.checkoutTime as string) ?? "11:00",
      preArrivalLeadMins: (data.preArrivalLeadMins as number) ?? 30,
      checkinSteps: (data.checkinSteps as AccessFormValues["checkinSteps"]) ?? [],
      checkoutSteps: (data.checkoutSteps as AccessFormValues["checkoutSteps"]) ?? [],
      securityNote: (data.securityNote as string) ?? "",
    },
  });

  const {
    fields: checkinFields,
    append: appendCheckin,
    remove: removeCheckin,
  } = useFieldArray({ control, name: "checkinSteps" });

  const {
    fields: checkoutFields,
    append: appendCheckout,
    remove: removeCheckout,
  } = useFieldArray({ control, name: "checkoutSteps" });

  function onSubmit(values: AccessFormValues) {
    onNext(values as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* WiFi */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">WiFi</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="wifiName">Network Name</Label>
            <Input id="wifiName" {...register("wifiName")} placeholder="HomeNetwork_5G" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wifiPassword">Password</Label>
            <Input id="wifiPassword" {...register("wifiPassword")} placeholder="password123" />
          </div>
        </div>
      </div>

      {/* Parking */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Parking</h3>
        <div className="space-y-1">
          <Label htmlFor="parkingSpot">Spot</Label>
          <Input id="parkingSpot" {...register("parkingSpot")} placeholder="P1-42" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="parkingInstructions">Instructions</Label>
          <Textarea
            id="parkingInstructions"
            {...register("parkingInstructions")}
            placeholder="Enter from the north entrance..."
            rows={2}
          />
        </div>
      </div>

      {/* Buzzer */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Buzzer / Entry</h3>
        <div className="space-y-1">
          <Label htmlFor="buzzerName">Buzzer Name</Label>
          <Input id="buzzerName" {...register("buzzerName")} placeholder="KITH" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="buzzerInstructions">Instructions</Label>
          <Textarea
            id="buzzerInstructions"
            {...register("buzzerInstructions")}
            placeholder="Press button at front door..."
            rows={2}
          />
        </div>
      </div>

      {/* Check-in / Check-out Times */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Times</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="checkinTime">Check-In Time</Label>
            <Input id="checkinTime" type="time" {...register("checkinTime")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="checkoutTime">Check-Out Time</Label>
            <Input id="checkoutTime" type="time" {...register("checkoutTime")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="preArrivalLeadMins">Pre-Arrival Lead (mins)</Label>
            <Input
              id="preArrivalLeadMins"
              type="number"
              {...register("preArrivalLeadMins", { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      {/* Check-in Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Check-In Steps</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendCheckin({
                step: checkinFields.length + 1,
                title: "",
                description: "",
                icon: "",
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        </div>
        {checkinFields.map((field, index) => (
          <div key={field.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Step {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 h-6 px-2"
                onClick={() => removeCheckin(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input {...register(`checkinSteps.${index}.title`)} placeholder="Arrive at building" />
              </div>
              <div className="space-y-1">
                <Label>Icon (emoji)</Label>
                <Input {...register(`checkinSteps.${index}.icon`)} placeholder="🏠" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                {...register(`checkinSteps.${index}.description`)}
                placeholder="Walk to the main entrance..."
                rows={2}
              />
            </div>
            <input type="hidden" {...register(`checkinSteps.${index}.step`, { valueAsNumber: true })} value={index + 1} />
          </div>
        ))}
      </div>

      {/* Check-out Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Check-Out Steps</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendCheckout({
                step: checkoutFields.length + 1,
                title: "",
                description: "",
              })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        </div>
        {checkoutFields.map((field, index) => (
          <div key={field.id} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Step {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 h-6 px-2"
                onClick={() => removeCheckout(index)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register(`checkoutSteps.${index}.title`)} placeholder="Strip the beds" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                {...register(`checkoutSteps.${index}.description`)}
                placeholder="Remove all bedding and pile near the door..."
                rows={2}
              />
            </div>
            <input type="hidden" {...register(`checkoutSteps.${index}.step`, { valueAsNumber: true })} value={index + 1} />
          </div>
        ))}
      </div>

      {/* Security Note */}
      <div className="space-y-1">
        <Label htmlFor="securityNote">Security Note</Label>
        <Textarea
          id="securityNote"
          {...register("securityNote")}
          placeholder="Do not interact with building security unless..."
          rows={2}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Amenities & Rules</Button>
      </div>
    </form>
  );
}
