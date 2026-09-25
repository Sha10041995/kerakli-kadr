import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/messages", "/notifications", "/onboarding", "/api/", "/login", "/register"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
