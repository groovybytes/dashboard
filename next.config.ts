import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  redirects: async () => [
    {
      "source": "/logout",
      "destination": "/api/auth/logout",
      "permanent": false
    },
    {
      "source": "/login",
      "destination": "/api/auth/login",
      "permanent": false
    }
  ]
};

export default nextConfig;
