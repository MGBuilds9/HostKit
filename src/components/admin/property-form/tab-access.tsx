"use client";

import { useForm, useFieldArray, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { propertyAccessSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { StepListEditor } from "./step-list-editor";

type AccessFormValues = z.input<typeof propertyAccessSchema>;

interface TabAccessProps {
  initialData: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  saving: boolean;
}

export function TabAccess({ initialData, onSave, saving }: TabAccessProps) {
  const { register, handleSubmit, control, setValue, watch } = useForm<AccessFormValues>({
    resolver: zodResolver(propertyAccessSchema),
    defaultValues: {
      wifiName: (initialData.wifiName as string) ?? "",
      wifiPassword: (initialData.wifiPassword as string) ?? "",
      parkingSpot: (initialData.parkingSpot as string) ?? "",
      parkingInstructions: (initialData.parkingInstructions as string) ?? "",
      buzzerName: (initialData.buzzerName as string) ?? "",
      buzzerInstructions: (initialData.buzzerInstructions as string) ?? "",
      checkinTime: (initialData.checkinTime as string) ?? "15:00",
      checkoutTime: (initialData.checkoutTime as string) ?? "11:00",
      preArrivalLeadMins: (initialData.preArrivalLeadMins as number) ?? 30,
      checkinSteps: (initialData.checkinSteps as AccessFormValues["checkinSteps"]) ?? [],
      checkoutSteps: (initialData.checkoutSteps as AccessFormValues["checkoutSteps"]) ?? [],
      securityNote: (initialData.securityNote as string) ?? "",
    },
  });

  const { fields: checkinFields, append: appendCheckin, remove: removeCheckin } =
    useFieldArray({ control, name: "checkinSteps" });
  const { fields: checkoutFields, append: appendCheckout, remove: removeCheckout } =
    useFieldArray({ control, name: "checkoutSteps" });

  // StepListEditor accepts Control<any> — cast required due to react-hook-form v8 strict generics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyControl = control as Control<any>;

  return (
    <form onSubmit={handleSubmit((v) => onSave(v as Record<string, unknown>))} className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">WiFi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Network Name</Label><Input {...register("wifiName")} placeholder="HomeNetwork_5G" /></div>
          <div className="space-y-1"><Label>Password</Label><Input {...register("wifiPassword")} placeholder="password123" /></div>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Parking</h3>
        <div className="space-y-1"><Label>Spot</Label><Input {...register("parkingSpot")} placeholder="P1-42" /></div>
        <div className="space-y-1"><Label>Instructions</Label><Textarea {...register("parkingInstructions")} placeholder="Enter from the north entrance..." rows={2} /></div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Buzzer / Entry</h3>
        <div className="space-y-1"><Label>Buzzer Name</Label><Input {...register("buzzerName")} placeholder="KITH" /></div>
        <div className="space-y-1"><Label>Instructions</Label><Textarea {...register("buzzerInstructions")} placeholder="Press button at front door..." rows={2} /></div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Times</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Check-In Time</Label><Input type="time" {...register("checkinTime")} /></div>
          <div className="space-y-1"><Label>Check-Out Time</Label><Input type="time" {...register("checkoutTime")} /></div>
          <div className="space-y-1"><Label>Pre-Arrival Lead (mins)</Label><Input type="number" {...register("preArrivalLeadMins", { valueAsNumber: true })} /></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Check-In Steps</h3>
          <Button type="button" variant="outline" size="sm"
            onClick={() => appendCheckin({ step: checkinFields.length + 1, title: "", description: "", icon: "", mediaUrl: "", mediaType: undefined })}>
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        </div>
        <StepListEditor register={register} control={anyControl} setValue={setValue} watch={watch} fields={checkinFields} remove={removeCheckin} name="checkinSteps" withMedia />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Check-Out Steps</h3>
          <Button type="button" variant="outline" size="sm"
            onClick={() => appendCheckout({ step: checkoutFields.length + 1, title: "", description: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        </div>
        <StepListEditor register={register} control={anyControl} setValue={setValue} watch={watch} fields={checkoutFields} remove={removeCheckout} name="checkoutSteps" />
      </div>
      <div className="space-y-1">
        <Label>Security Note</Label>
        <Textarea {...register("securityNote")} placeholder="Do not interact with building security unless..." rows={2} />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Access"}</Button>
      </div>
    </form>
  );
}
