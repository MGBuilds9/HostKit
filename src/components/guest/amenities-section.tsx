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
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Amenities</h2>
      <Accordion type="multiple" className="space-y-2">
        {sections.map(({ id, label, icon: Icon, items }) => (
          <AccordionItem key={id} value={id} className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[#FF6B6B]" />
                {label}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-1 gap-1.5 pb-2">
                {items!.map((item, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-slate-400" />
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
