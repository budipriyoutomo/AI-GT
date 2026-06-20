import type { MetadataRoute } from "next";

const BASE_URL = "https://aigt.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/privacy", "/terms", "/contact"],
        disallow: [
          "/dashboard",
          "/billing",
          "/payment",
          "/subscription",
          "/settings",
          "/editor",
          "/onboarding",
          "/campaign",
          "/history",
          "/generate",
          "/templates",
          "/create",
          "/schedule",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
