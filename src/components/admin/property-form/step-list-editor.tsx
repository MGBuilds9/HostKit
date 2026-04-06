"use client";

import { UseFormRegister, Control, UseFieldArrayRemove, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { MediaUpload } from "@/components/ui/media-upload";

interface StepField {
  id: string;
}

interface StepListEditorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  fields: StepField[];
  remove: UseFieldArrayRemove;
  name: "checkinSteps" | "checkoutSteps";
  withMedia?: boolean;
}

export function StepListEditor({ register, fields, remove, setValue, watch, name, withMedia }: StepListEditorProps) {
  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
            <Button type="button" variant="ghost" size="sm"
              className="text-red-500 hover:text-red-700 h-6 px-2"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input {...register(`${name}.${index}.title`)} placeholder="Step title" />
            </div>
            {withMedia && (
              <div className="space-y-1">
                <Label>Icon (emoji)</Label>
                <Input {...register(`${name}.${index}.icon`)} placeholder="🏠" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea {...register(`${name}.${index}.description`)} placeholder="Describe this step..." rows={2} />
          </div>
          {withMedia && (
            <div className="space-y-2">
              <Label>Media (optional)</Label>
              <div className="flex flex-col md:flex-row gap-2">
                <Input {...register(`${name}.${index}.mediaUrl`)} placeholder="Paste URL or use upload below" className="flex-1" />
                <select {...register(`${name}.${index}.mediaType`)}
                  className="border rounded-md px-2 py-1.5 text-sm bg-background">
                  <option value="">Type</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              <MediaUpload
                onUpload={(url, mediaType) => {
                  if (url) {
                    setValue(`${name}.${index}.mediaUrl`, url);
                    setValue(`${name}.${index}.mediaType`, mediaType);
                  }
                }}
                currentUrl={watch(`${name}.${index}.mediaUrl`)}
                currentMediaType={watch(`${name}.${index}.mediaType`) as "image" | "video" | undefined}
              />
            </div>
          )}
          <input type="hidden" {...register(`${name}.${index}.step`, { valueAsNumber: true })} value={index + 1} />
        </div>
      ))}
    </div>
  );
}
