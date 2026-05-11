import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/lotto/:address",
        destination: "/metamask/lotto/:address",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
