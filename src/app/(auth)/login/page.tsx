"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">HostKit</CardTitle>
        <p className="text-sm text-muted-foreground">Property management toolkit</p>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/admin" })}>
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
