import Link from "next/link";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Plus } from "lucide-react";
import { desc } from "drizzle-orm";

export default async function TemplatesPage() {
  await requireAuth(["admin", "manager"]);

  const templates = await db
    .select()
    .from(messageTemplates)
    .orderBy(desc(messageTemplates.sortOrder), desc(messageTemplates.createdAt));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Message Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Global and property-specific message templates used by the message generator.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/templates/checklist">
              <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Checklist Templates
            </Link>
          </Button>
          <Button size="sm" disabled>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="font-medium mb-1">No templates yet</p>
          <p className="text-sm">Message templates will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <div className="flex gap-2 flex-shrink-0">
                    <Badge variant={tpl.isGlobal ? "default" : "secondary"}>
                      {tpl.isGlobal ? "Global" : "Property"}
                    </Badge>
                    <Badge variant={tpl.active ? "default" : "secondary"}>
                      {tpl.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {tpl.triggerDescription && (
                  <p>
                    <span className="font-medium text-foreground">Trigger:</span>{" "}
                    {tpl.triggerDescription}
                  </p>
                )}
                <p className="text-xs">Sort order: {tpl.sortOrder ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Template editing UI is planned for a future release. Templates support Mustache-style
        variables (e.g.{" "}
        <code className="bg-muted px-1 rounded">{"{{property.wifiName}}"}</code>).
      </p>
    </div>
  );
}
