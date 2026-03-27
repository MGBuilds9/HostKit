import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { NewOwnerForm } from "./new-owner-form";

export default async function NewOwnerPage() {
  await requireAuth(["admin", "manager"]);

  const userList = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .orderBy(asc(users.name));

  return <NewOwnerForm users={userList} />;
}
