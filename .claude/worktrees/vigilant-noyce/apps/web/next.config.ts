import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gymory/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
