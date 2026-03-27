"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TemplateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name") as string,
      bodyTemplate: formData.get("bodyTemplate") as string,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      isGlobal: formData.get("isGlobal") === "on",
    };

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      router.push("/admin/templates");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data?.error?.formErrors?.[0] ?? "Failed to create template. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">New Message Template</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required placeholder="Check-in Welcome" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bodyTemplate">Message Body *</Label>
              <Textarea
                id="bodyTemplate"
                name="bodyTemplate"
                required
                placeholder="Hi {{guest_name}}, welcome to {{property_name}}…"
                rows={8}
                className="resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                defaultValue={0}
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isGlobal"
                name="isGlobal"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="isGlobal">Global template (available to all properties)</Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create Template"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
