import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hostkit.mkgbuilds.com";
  return {
    rules: [
      { userAgent: "*", allow: "/g/", disallow: ["/admin/", "/cleaner/", "/api/", "/login"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
