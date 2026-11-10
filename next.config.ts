import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: false,
  basePath: isGitHubPages ? '/chessmind-local' : '',
  assetPrefix: isGitHubPages ? '/chessmind-local/' : '',
};

export default nextConfig;
