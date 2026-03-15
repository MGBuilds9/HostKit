export function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-[family-name:var(--font-inter)] min-h-screen" style={{ background: "hsl(var(--guest-bg))" }}>
      <div className="mx-auto max-w-lg sm:max-w-2xl lg:max-w-4xl">{children}</div>
    </div>
  );
}
