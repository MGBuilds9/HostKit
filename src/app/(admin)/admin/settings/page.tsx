import { requireAuth } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Mail, Settings } from "lucide-react";
import Image from "next/image";
import { AppSettingsForm } from "@/components/admin/app-settings-form";

export default async function SettingsPage() {
  const session = await requireAuth();
  const { user } = session;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Your Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "User avatar"}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full border"
                priority
              />
            )}
            <div>
              <p className="font-medium">{user.name ?? "—"}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Role:</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Application Settings */}
      {user.role === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" /> Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppSettingsForm />
          </CardContent>
        </Card>
      )}

      {user.role !== "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" /> Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only admins can modify application settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
