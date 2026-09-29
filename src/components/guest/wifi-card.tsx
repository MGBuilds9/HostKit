"use client";

import { useState, useEffect } from "react";
import { Wifi, Copy, Check, QrCode } from "lucide-react";
import QRCode from "qrcode";
import Image from "next/image";

interface WifiProps {
  name: string;
  password: string;
}

export function WifiCard({ name, password }: WifiProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (name && password) {
      QRCode.toDataURL(`WIFI:S:${name};T:WPA;P:${password};;`, {
        margin: 1,
        width: 140,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      })
        .then(setQrDataUrl)
        .catch((err) => {
          console.error("Failed to generate Wi-Fi QR code", err);
        });
    }
  }, [name, password]);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <div className="rounded-xl p-5 shadow-sm dark:shadow-none border border-[var(--guest-card-border)]" style={{ background: "var(--guest-card)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" style={{ color: "var(--guest-accent)" }} />
            <h3 className="font-semibold">WiFi</h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--guest-accent-soft)", color: "var(--guest-accent)" }}>
            High-Speed
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: "var(--guest-text-muted)" }}>Network</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex justify-between items-start flex-wrap gap-2">
            <span className="text-sm" style={{ color: "var(--guest-text-muted)" }}>Password</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm break-all">{password}</span>
              <button
                onClick={copyPassword}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{ background: "var(--guest-accent-soft)", color: "var(--guest-accent)" }}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {qrDataUrl && (
            <div className="mt-3 pt-3 border-t border-[var(--guest-card-border)] flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-lg border shadow-sm shrink-0">
                <Image
                  src={qrDataUrl}
                  alt="Wi-Fi QR Code"
                  width={80}
                  height={80}
                  className="rounded"
                  unoptimized
                />
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--guest-text-muted)" }}>
                <span className="font-semibold flex items-center gap-1 text-[var(--guest-text-main)] mb-0.5">
                  <QrCode className="h-3.5 w-3.5" style={{ color: "var(--guest-accent)" }} />
                  Scan to Connect Instantly
                </span>
                Point your phone camera here to join the network without typing the password.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
