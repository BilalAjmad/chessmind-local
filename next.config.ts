import type { NextConfig } from "next";

// Fully static export — the whole game is one self-contained folder (out/).
// That folder is what gets:
//   • zipped into the Electron desktop apps (Windows / macOS / Linux)
//   • synced into an Android app via Capacitor
//   • deployed to any static host (Vercel, Netlify, GitHub Pages) as a PWA
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: false,
};

export default nextConfig;
