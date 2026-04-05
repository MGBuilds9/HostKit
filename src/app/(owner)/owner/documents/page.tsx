export const dynamic = "force-dynamic";

import { db } from "@/db";
import { owners, ownerDocuments } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(type: string): string {
  switch (type) {
    case "lease":
      return "Lease";
    case "tax":
      return "Tax";
    case "insurance":
      return "Insurance";
    default:
      return "Other";
  }
}

export default async function OwnerDocumentsPage() {
  const session = await requireAuth(["owner", "admin"]);

  const owner = await db.query.owners.findFirst({
    where: or(
      eq(owners.userId, session.user.id),
      eq(owners.email, session.user.email!)
    ),
  });

  if (!owner) {
    if (session.user.role === "admin") redirect("/admin");
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Your owner profile has not been set up yet. Please contact your property manager.
        </p>
      </div>
    );
  }

  const documents = await db
    .select()
    .from(ownerDocuments)
    .where(eq(ownerDocuments.ownerId, owner.id))
    .orderBy(ownerDocuments.uploadedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>

      {documents.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents"
          description="No documents have been uploaded yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-base">{doc.name}</p>
                  <Badge variant="secondary">{typeLabel(doc.type)}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(doc.uploadedAt)}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
