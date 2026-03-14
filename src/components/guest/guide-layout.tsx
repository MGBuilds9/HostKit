import { Inter, DM_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${dmSans.variable} font-sans min-h-screen bg-white`}>
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
