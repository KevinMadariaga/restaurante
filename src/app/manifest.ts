import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pueblito Paisa",
    short_name: "Pueblito",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf6ec",
    theme_color: "#fbf6ec",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
