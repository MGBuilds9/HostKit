import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleSelector } from "@/components/admin/role-selector";
import { Users } from "lucide-react";

export default async function UsersPage() {
  const session = await requireAuth(["admin"]);

  const allUsers = await db.select().from(users).orderBy(asc(users.createdAt));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">User Management</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            All Users ({allUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {allUsers.map((user) => {
              const isSelf = user.id === session.user.id;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={user.name ?? "Avatar"}
                        className="h-10 w-10 rounded-full border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full border bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.name ?? "—"}
                      {isSelf && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>

                  {/* Role badge */}
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className="shrink-0"
                  >
                    {user.role}
                  </Badge>

                  {/* Role selector — disabled for self */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground">Cannot change own role</span>
                    ) : (
                      <RoleSelector userId={user.id} currentRole={user.role} />
                    )}
                  </div>
                </div>
              );
            })}

            {allUsers.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">
                No users found.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
