import { notFound } from "next/navigation";
import { db } from "@/db";
import { messageTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { TemplateForm } from "../../new/template-form";

interface Props {
  params: { id: string };
}

export default async function EditTemplatePage({ params }: Props) {
  await requireAuth(["admin", "manager"]);

  const template = await db.query.messageTemplates.findFirst({
    where: eq(messageTemplates.id, params.id),
  });

  if (!template) notFound();

  return (
    <TemplateForm
      templateId={template.id}
      initialValues={{
        name: template.name,
        bodyTemplate: template.bodyTemplate,
        sortOrder: template.sortOrder ?? 0,
        isGlobal: template.isGlobal ?? false,
      }}
    />
  );
}
