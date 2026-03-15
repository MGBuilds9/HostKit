interface CheckoutStep {
  step: number;
  title: string;
  description: string;
}

export function CheckoutSection({ steps, time }: { steps: CheckoutStep[]; time: string }) {
  // Format time: "11:00" → "11:00 AM"
  const formatted = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-1">Checkout</h2>
      <p className="text-sm mb-3" style={{ color: "hsl(var(--guest-text-muted))" }}>Please complete by {formatted}</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.step} className="flex items-start gap-3 py-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[hsl(var(--guest-card-border))] text-xs mt-0.5" style={{ color: "hsl(var(--guest-text-muted))" }}>
              {s.step}
            </div>
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs" style={{ color: "hsl(var(--guest-text-muted))" }}>{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
