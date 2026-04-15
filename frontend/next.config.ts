import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { remotePatterns: [
    { protocol: "https", hostname: "covers.openlibrary.org" },
    { protocol: "https", hostname: "image.tmdb.org" },
    { protocol: "https", hostname: "media.rawg.io" },
    { protocol: "https", hostname: "s4.anilist.co" },
  ]},
};
export default nextConfig;
