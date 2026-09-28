import { notFound } from "next/navigation";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { ChecklistTemplateForm } from "../../new/checklist-template-form";

interface Props {
  params: { id: string };
}

export default async function EditChecklistTemplatePage({ params }: Props) {
  await requireAuth(["admin", "manager"]);

  const template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, params.id),
  });

  if (!template) notFound();

  return (
    <ChecklistTemplateForm
      templateId={template.id}
      initialValues={{
        name: template.name,
        isGlobal: template.isGlobal ?? false,
        sections: template.sections ?? [],
      }}
    />
  );
}
