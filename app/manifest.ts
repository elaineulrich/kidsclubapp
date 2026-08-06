import type { MetadataRoute } from "next";

// Lets "Add to Home Screen" on Android use the actual logo (and app name/colors)
// instead of a generated tile. iOS instead looks at app/apple-icon.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Haven Kids Club",
    short_name: "Haven Kids Club",
    description: "Haven Kids Club check-in, transportation, and family management",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2568ab",
    icons: [
      {
        src: "/app-icon.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}
