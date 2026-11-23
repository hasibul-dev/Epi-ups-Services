import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/accounts",
        destination: "/erp",
        permanent: false,
      },
      {
        source: "/accounts/:path*",
        destination: "/erp/:path*",
        permanent: false,
      },
      {
        source: "/maintenance",
        destination: "/service/maintenance",
        permanent: false,
      },
      {
        source: "/maintenance/:path*",
        destination: "/service/maintenance/:path*",
        permanent: false,
      },
      {
        source: "/installation",
        destination: "/service/installation",
        permanent: false,
      },
      {
        source: "/installation/:path*",
        destination: "/service/installation/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
