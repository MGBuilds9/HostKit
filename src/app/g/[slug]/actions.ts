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
    return { error: "This guide is not available." };
  }
  const code = String(formData.get("code") ?? "");
  const ok = await unlockGuide(property.slug, property.guestAccessCode, code);
  if (ok) {
    // Cookie is set; force the page to re-render with the guide content.
    revalidatePath(`/g/${slug}`);
    revalidatePath("/");
  }
  return ok ? { error: null } : { error: "Incorrect code. Try again." };
}
