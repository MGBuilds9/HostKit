export const dynamic = "force-dynamic";

import { requireAuth } from "@/lib/auth-guard";
import CleaningTasksClient from "./cleaning-tasks-client";

export default async function CleaningTasksPage() {
  await requireAuth(["admin", "manager"]);
  return <CleaningTasksClient />;
}
