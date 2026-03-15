interface HeroProps {
  name: string;
  description: string | null;
  city: string;
}

export function HeroSection({ name, description, city }: HeroProps) {
  return (
    <section
      className="text-white px-6 py-16 md:py-20 lg:py-24 rounded-b-3xl"
      style={{ background: `linear-gradient(to bottom right, hsl(var(--guest-hero-from)), hsl(var(--guest-hero-to)))` }}
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Welcome to</p>
        <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl lg:text-5xl font-bold mt-2">{name}</h1>
        <div className="w-16 h-0.5 mt-4 mb-4" style={{ background: "hsl(var(--guest-accent))" }} />
        <p className="text-white/80 text-lg">{description ?? `Your home away from home in ${city}`}</p>
      </div>
    </section>
  );
}
