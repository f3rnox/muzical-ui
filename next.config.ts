import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["browser-id3-writer"],
};

export default nextConfig;
