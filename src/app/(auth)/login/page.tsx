"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm rounded-3xl shadow-none sm:shadow-lg">
      <CardHeader className="text-center space-y-3 pt-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <svg width="24" height="24" viewBox="0 0 512 512" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
              <line x1="168" y1="180" x2="168" y2="400" />
              <line x1="344" y1="180" x2="344" y2="400" />
              <line x1="168" y1="290" x2="344" y2="290" />
              <polyline points="120,200 256,110 392,200" />
            </g>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HostKit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Property management for short-term rentals
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-8 pt-2">
        <Button
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/admin" })}
        >
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
