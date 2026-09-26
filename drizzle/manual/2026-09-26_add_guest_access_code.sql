-- Adds per-property guest-guide access code (gates /g/[slug]).
-- Idempotent: safe to run more than once.
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "guest_access_code" text;
