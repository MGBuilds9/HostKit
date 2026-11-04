import { GuideJumpNav } from "@/components/guest/guide-jump-nav";
import { ThemeToggle } from "@/components/guest/theme-toggle";

export function GuideLayout({
  children,
  showNav = true,
  sectionIds,
}: {
  children: React.ReactNode;
  showNav?: boolean;
  sectionIds?: string[];
}) {
  return (
    <div
      id="guide-top"
      className="guest-guide font-[family-name:var(--font-inter)] min-h-screen"
      style={{ background: "var(--guest-bg)", color: "var(--guest-text)" }}
    >
      <div className="mx-auto w-full max-w-lg sm:max-w-2xl md:max-w-4xl lg:max-w-6xl">
        {showNav ? (
          <GuideJumpNav initialSectionIds={sectionIds} />
        ) : (
          <div className="flex justify-end px-5 pt-4 sm:px-8">
            <ThemeToggle />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
