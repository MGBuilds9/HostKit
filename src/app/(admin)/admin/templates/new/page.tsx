import { requireAuth } from "@/lib/auth-guard";
import { TemplateForm } from "./template-form";

export default async function NewTemplatePage() {
  await requireAuth(["admin", "manager"]);

  return <TemplateForm />;
}
