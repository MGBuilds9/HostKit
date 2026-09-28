import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleSelector } from "@/components/admin/role-selector";
import { UserActions } from "@/components/admin/user-actions";
import { Users } from "lucide-react";
import Image from "next/image";

export default async function UsersPage() {
  const session = await requireAuth(["admin"]);

  const allUsers = await db.select().from(users).orderBy(asc(users.createdAt));

  const adminCount = allUsers.filter((u) => u.role === "admin" && u.isActive).length;

  return (
    <div className="max-w-5xl space-y-6">
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
              const isLastActiveAdmin =
                user.role === "admin" && user.isActive && adminCount <= 1;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? "User avatar"}
                        width={40}
                        height={40}
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
                    {user.phone && (
                      <p className="text-xs text-muted-foreground truncate">{user.phone}</p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.isActive ? "outline" : "destructive"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Role selector — disabled for self and last active admin */}
                  <div className="shrink-0">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground">Cannot change own role</span>
                    ) : isLastActiveAdmin ? (
                      <span className="text-xs text-muted-foreground">Last active admin</span>
                    ) : (
                      <RoleSelector userId={user.id} currentRole={user.role} />
                    )}
                  </div>

                  {/* Edit / active toggle / delete */}
                  <div className="shrink-0">
                    <UserActions
                      userId={user.id}
                      name={user.name}
                      email={user.email}
                      phone={user.phone}
                      isActive={user.isActive}
                      isSelf={isSelf}
                      isLastActiveAdmin={isLastActiveAdmin}
                    />
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
