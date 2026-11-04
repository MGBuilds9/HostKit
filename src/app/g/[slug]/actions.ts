"use server";

import { unlockGuide } from "@/lib/guest-access";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * useFormState-shaped: (boundSlug, prevState, formData).
 * Validates a guest access code and sets the unlock cookie.
 */
export async function unlockGuideAction(
  slug: string,
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
  });
  if (!property || !property.active || !property.guestAccessCode) {
    return {
      error:
        "This guest guide is currently unavailable. Contact your host directly for arrival details.",
    };
  }
  const code = String(formData.get("code") ?? "").trim();
  if (!code) {
    return {
      error:
        "Access code is required. Enter the code from your check-in message to open the guide.",
    };
  }
  const ok = await unlockGuide(property.slug, property.guestAccessCode, code);
  if (ok) {
    // Cookie is set; force the page to re-render with the guide content.
    revalidatePath(`/g/${slug}`);
    revalidatePath("/");
  }
  return ok
    ? { error: null }
    : {
        error:
          "That access code didn't match. Check your check-in message from your host and enter the code again.",
      };
}
