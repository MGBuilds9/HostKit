"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePropertyForm } from "./use-property-form";
import { TabBasics } from "./tab-basics";
import { TabAccess } from "./tab-access";
import { TabAmenities } from "./tab-amenities";
import { TabNearby } from "./tab-nearby";
import { TabReview } from "./tab-review";

interface PropertyFormProps {
  owners: { id: string; name: string }[];
  initialData?: Record<string, unknown>;
  propertyId?: string;
}

export function PropertyForm({ owners, initialData = {}, propertyId }: PropertyFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const { saveTab, saving, lastSavedTab } = usePropertyForm(propertyId, initialData);

  async function handleSave(tabKey: string, data: Record<string, unknown>): Promise<boolean> {
    const merged = { ...formData, ...data };
    setFormData(merged);
    return saveTab(tabKey, data);
  }

  return (
    <div className="space-y-4">
      {lastSavedTab && (
        <p className="text-xs text-green-600 text-right">
          Saved: <span className="font-medium capitalize">{lastSavedTab}</span>
        </p>
      )}
      <Tabs defaultValue="basics">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="amenities">Amenities</TabsTrigger>
          <TabsTrigger value="nearby">Nearby</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-6">
          <TabBasics
            initialData={formData}
            owners={owners}
            onSave={(data) => handleSave("basics", data)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <TabAccess
            initialData={formData}
            onSave={(data) => handleSave("access", data)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="amenities" className="mt-6">
          <TabAmenities
            initialData={formData}
            onSave={(data) => handleSave("amenities", data)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="nearby" className="mt-6">
          <TabNearby
            initialData={formData}
            onSave={(data) => handleSave("nearby", data)}
            saving={saving}
          />
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <TabReview data={formData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
