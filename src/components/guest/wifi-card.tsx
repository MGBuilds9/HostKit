"use client";

import { useState } from "react";
import { Wifi, Copy, Check } from "lucide-react";

interface WifiProps {
  name: string;
  password: string;
}

export function WifiCard({ name, password }: WifiProps) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <div className="rounded-xl p-5 shadow-sm dark:shadow-none border border-[hsl(var(--guest-card-border))]" style={{ background: "hsl(var(--guest-card))" }}>
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="h-4 w-4" style={{ color: "hsl(var(--guest-accent))" }} />
          <h3 className="font-semibold">WiFi</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: "hsl(var(--guest-text-muted))" }}>Network</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <span className="text-sm" style={{ color: "hsl(var(--guest-text-muted))" }}>Password</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm break-all">{password}</span>
              <button
                onClick={copyPassword}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: "hsl(var(--guest-accent-soft))", color: "hsl(var(--guest-accent))" }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
