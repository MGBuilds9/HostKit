"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { MessageGenerator } from "@/components/admin/message-generator";

interface Property {
  id: string;
  name: string;
}

export function MessagesPageClient({ properties }: { properties: Property[] }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0]?.id ?? ""
  );

  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No properties found. Create a property first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Label>Property</Label>
        <select
          value={selectedPropertyId}
          onChange={(e) => setSelectedPropertyId(e.target.value)}
          className="flex h-12 md:h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <MessageGenerator
        key={selectedPropertyId}
        propertyId={selectedPropertyId}
      />
    </div>
  );
}
