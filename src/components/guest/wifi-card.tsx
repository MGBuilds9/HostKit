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
    <section className="px-5">
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="h-4 w-4 text-[#FF6B6B]" />
          <h3 className="font-semibold">WiFi</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Network</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <span className="text-sm text-slate-500">Password</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm break-all">{password}</span>
              <button
                onClick={copyPassword}
                className="flex items-center gap-1 rounded-lg bg-[#FF6B6B]/10 px-3 py-1.5 text-xs font-medium text-[#FF6B6B] hover:bg-[#FF6B6B]/20 transition-colors"
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
