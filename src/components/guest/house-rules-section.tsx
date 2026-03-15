import * as LucideIcons from "lucide-react";
import { ShieldAlert } from "lucide-react";
import { toPascalCase } from "@/lib/utils";

interface Rule {
  rule: string;
  icon?: string;
}

export function HouseRulesSection({ rules, securityNote }: { rules: Rule[]; securityNote: string | null }) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">House Rules</h2>
      <div className="space-y-2">
        {rules.map((r, i) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
          const Icon = r.icon
            ? icons[toPascalCase(r.icon)] ?? LucideIcons.CircleDot
            : LucideIcons.CircleDot;
          return (
            <div key={i} className="flex items-center gap-3 py-2">
              <Icon className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--guest-text-muted))" }} />
              <span className="text-sm">{r.rule}</span>
            </div>
          );
        })}
      </div>
      {securityNote && (
        <div className="mt-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">{securityNote}</p>
        </div>
      )}
    </section>
  );
}
