"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({
  callbackUrl,
  className,
  children,
}: {
  callbackUrl: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => signOut({ callbackUrl })}>
      {children}
    </button>
  );
}
