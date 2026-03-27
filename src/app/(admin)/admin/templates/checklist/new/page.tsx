import { requireAuth } from "@/lib/auth-guard";
import { ChecklistTemplateForm } from "./checklist-template-form";

export default async function NewChecklistTemplatePage() {
  await requireAuth(["admin", "manager"]);

  return <ChecklistTemplateForm />;
}
