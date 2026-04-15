import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "academy.ecom-society.com",
      },
    ],
  },
};

export default nextConfig;
