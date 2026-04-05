/**
 * Environment variable validation.
 * Throws at import time if required server-side vars are missing.
 * Client-side vars are validated lazily (may be empty at build time).
 */
import { z } from "zod";

// ── Server-side schema ────────────────────────────────────────────────────────

const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Cron
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // S3 / MinIO
  S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT is required"),
  S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().min(1, "S3_SECRET_KEY is required"),

  // Optional server-side vars
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_ADDRESS: z
    .string()
    .optional()
    .default("HostKit <notifications@updates.mkguirguis.com>"),
  S3_BUCKET: z.string().optional().default("hostkit"),
  S3_PUBLIC_URL: z.string().optional(),
});

// ── Client-side schema ────────────────────────────────────────────────────────

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_BASE_URL: z.string().optional(),
});

// ── Parse & export ────────────────────────────────────────────────────────────

// Only parse server vars on the server side (not in browser bundles)
const isServer = typeof window === "undefined";

let serverEnv: z.infer<typeof serverSchema>;
if (isServer) {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Missing or invalid environment variables:\n${missing}\n\nCheck your .env file.`
    );
  }
  serverEnv = parsed.data;
} else {
  // Return empty object cast — server vars must never be accessed client-side
  serverEnv = {} as z.infer<typeof serverSchema>;
}

const clientParsed = clientSchema.safeParse(process.env);
const clientEnv = clientParsed.success
  ? clientParsed.data
  : ({} as z.infer<typeof clientSchema>);

export const env = {
  ...serverEnv,
  ...clientEnv,
} as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;
