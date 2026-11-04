"use client";

import { useState, useEffect } from "react";
import { Wifi, QrCode } from "lucide-react";
import QRCode from "qrcode";
import Image from "next/image";
import { CopyButton } from "@/components/guest/copy-button";
import { buildWifiQrPayload } from "@/lib/guide-utils";

interface WifiProps {
  name: string;
  password: string;
}

export function WifiCard({ name, password }: WifiProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!name || !password) return;
    let cancelled = false;
    const rootStyle = getComputedStyle(document.documentElement);
    const darkHex = rootStyle.getPropertyValue("--guest-qr-dark-hex").trim();
    const lightHex = rootStyle.getPropertyValue("--guest-qr-light-hex").trim();

    QRCode.toDataURL(buildWifiQrPayload(name, password), {
      margin: 1,
      width: 160,
      ...(darkHex && lightHex
        ? {
            color: {
              dark: darkHex,
              light: lightHex,
            },
          }
        : {}),
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate Wi-Fi QR code", err);
      });

    return () => {
      cancelled = true;
    };
  }, [name, password]);

  return (
    <div>
      <div className="mb-3.5 flex flex-col">
        <div className="flex items-center gap-2">
          <Wifi
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: "var(--guest-accent)" }}
          />
          <h2
            className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight not-italic"
            style={{ overflowWrap: "anywhere", minWidth: 0 }}
          >
            Wi-Fi
          </h2>
        </div>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--guest-text-muted)" }}>
          Copy the password or scan the QR code to join right away.
        </p>
      </div>

      <div
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <span
              className="block text-xs font-medium"
              style={{ color: "var(--guest-text-muted)" }}
            >
              Network (SSID)
            </span>
            <span className="mt-0.5 block break-words font-mono text-sm font-semibold tabular-nums">
              {name}
            </span>
          </div>
          <CopyButton
            value={name}
            label="Copy name"
            copiedLabel="Copied"
            ariaLabel={`Copy Wi-Fi network name ${name}`}
          />
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
          style={{ borderColor: "var(--guest-card-border)" }}
        >
          <div className="min-w-0">
            <span
              className="block text-xs font-medium"
              style={{ color: "var(--guest-text-muted)" }}
            >
              Password
            </span>
            <span className="mt-0.5 block break-all font-mono text-sm font-semibold">
              {password}
            </span>
          </div>
          <CopyButton
            value={password}
            label="Copy password"
            copiedLabel="Password copied"
            ariaLabel="Copy Wi-Fi password"
          />
        </div>

        {qrDataUrl && (
          <div
            className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5"
            style={{
              background: "var(--guest-section-bg)",
              borderColor: "var(--guest-card-border)",
            }}
          >
            <div
              className="shrink-0 rounded-lg p-1.5"
              style={{
                background: "var(--color-qr-paper)",
              }}
            >
              <Image
                src={qrDataUrl}
                alt={`QR code to join Wi-Fi network ${name}`}
                width={76}
                height={76}
                className="rounded"
                unoptimized
              />
            </div>
            <div className="min-w-0 text-xs leading-relaxed" style={{ color: "var(--guest-text-muted)" }}>
              <p
                className="mb-0.5 flex items-center gap-1.5 font-semibold"
                style={{ color: "var(--guest-text)" }}
              >
                <QrCode
                  className="h-3.5 w-3.5 shrink-0"
                  strokeWidth={1.75}
                  style={{ color: "var(--guest-accent)" }}
                />
                <span>Scan camera to join</span>
              </p>
              <p>Point your phone camera at the QR code to connect without typing.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
