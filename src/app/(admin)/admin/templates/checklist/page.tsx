import Link from "next/link";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { TemplateDeleteButton } from "../template-actions";

export default async function ChecklistTemplatesPage() {
  await requireAuth(["admin", "manager"]);

  const templates = await db
    .select()
    .from(checklistTemplates)
    .orderBy(desc(checklistTemplates.createdAt));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Checklist Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Turnover checklist templates used for property cleaning and inspection.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/templates">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Message Templates
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/templates/checklist/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Template
            </Link>
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="font-medium mb-1">No checklist templates yet</p>
          <p className="text-sm">Checklist templates will appear here once created.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{tpl.name}</CardTitle>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={tpl.isGlobal ? "default" : "secondary"}>
                      {tpl.isGlobal ? "Global" : "Property"}
                    </Badge>
                    <TemplateDeleteButton id={tpl.id} apiPath="/api/templates/checklist" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {tpl.sections && tpl.sections.length > 0 ? (
                  <>
                    <p>{tpl.sections.length} section{tpl.sections.length !== 1 ? "s" : ""}</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {tpl.sections.map((section, i) => (
                        <li key={i}>
                          {section.title}{" "}
                          <span className="text-xs">({section.items?.length ?? 0} items)</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>No sections defined</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Checklist template editing UI is planned for a future release. Templates are applied when
        creating a new turnover for a property.
      </p>
    </div>
  );
}
