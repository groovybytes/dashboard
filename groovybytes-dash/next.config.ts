import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  redirects: async () => [
    {
      "source": "/logout",
      "destination": "/.auth/logout",
      "permanent": false
    },
    {
      "source": "/login/github",
      "destination": "/.auth/login/github",
      "permanent": false
    },
    {
      "source": "/login",
      "destination": "/.auth/login/aad",
      "permanent": false
    }
  ]
};

export default nextConfig;
