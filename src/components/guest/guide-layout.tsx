import { GuideJumpNav } from "@/components/guest/guide-jump-nav";

export function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-[family-name:var(--font-inter)] min-h-screen"
      style={{ background: "var(--guest-bg)" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        <GuideJumpNav />
        {children}
      </div>
    </div>
  );
}
