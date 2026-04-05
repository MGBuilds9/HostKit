"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UtensilsCrossed, Bath, Sofa } from "lucide-react";

interface AmenitiesProps {
  kitchen: string[] | null;
  bathroom: string[] | null;
  general: string[] | null;
}

export function AmenitiesSection({ kitchen, bathroom, general }: AmenitiesProps) {
  const sections = [
    { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed, items: kitchen },
    { id: "bathroom", label: "Bathrooms", icon: Bath, items: bathroom },
    { id: "general", label: "General Amenities", icon: Sofa, items: general },
  ].filter(s => s.items && s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <section>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Amenities</h2>
      <Accordion type="multiple" className="space-y-2">
        {sections.map(({ id, label, icon: Icon, items }) => (
          <AccordionItem key={id} value={id} className="rounded-xl border border-[hsl(var(--guest-card-border))] shadow-sm dark:shadow-none px-4" style={{ background: "hsl(var(--guest-card))" }}>
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[hsl(var(--guest-accent))]" />
                <span className="text-[hsl(var(--guest-accent))] font-semibold">{label}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-1 gap-1.5 pb-2">
                {items!.map((item, i) => (
                  <li key={i} className="text-sm flex items-center gap-2" style={{ color: "hsl(var(--guest-text-muted))" }}>
                    <span className="h-1 w-1 rounded-full bg-[hsl(var(--guest-text-muted))]" />
                    {item}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
