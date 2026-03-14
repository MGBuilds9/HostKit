import * as LucideIcons from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { toPascalCase } from "@/lib/utils";

interface Rule {
  rule: string;
  icon?: string;
}

export function HouseRulesSection({ rules, securityNote }: { rules: Rule[]; securityNote: string | null }) {
  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">House Rules</h2>
      <div className="space-y-2">
        {rules.map((r, i) => {
          const Icon = r.icon
            ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[toPascalCase(r.icon)] ?? LucideIcons.CircleDot
            : LucideIcons.CircleDot;
          return (
            <div key={i} className="flex items-center gap-3 py-2">
              <Icon className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-sm">{r.rule}</span>
            </div>
          );
        })}
      </div>
      {securityNote && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{securityNote}</p>
        </div>
      )}
    </section>
  );
}
