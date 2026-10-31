import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        // ffmpeg.wasm requires SharedArrayBuffer — needs COOP/COEP headers
        source: "/admin/superadmin/video-convert",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/superadmin/compress-image": ["./node_modules/@img/**/*"],
    "/api/own-pages/upload-image": ["./node_modules/@img/**/*"],
  },
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
