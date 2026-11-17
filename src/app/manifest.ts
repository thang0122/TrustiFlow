import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TrustiFlow – Export Operations AI",
    short_name: "TrustiFlow",
    description: "AI workspace for export professionals: documents, quotations and trade review.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f7fb",
    theme_color: "#10243e",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }
    ]
  };
}
