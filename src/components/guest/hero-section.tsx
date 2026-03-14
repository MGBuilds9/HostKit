interface HeroProps {
  name: string;
  description: string | null;
  city: string;
}

export function HeroSection({ name, description, city }: HeroProps) {
  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-700 text-white px-6 py-16 rounded-b-3xl">
      <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Welcome to</p>
      <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold mt-2">{name}</h1>
      <div className="w-12 h-0.5 bg-[#FF6B6B] mt-4 mb-4" />
      <p className="text-white/80 text-lg">{description ?? `Your home away from home in ${city}`}</p>
    </section>
  );
}
