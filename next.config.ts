import type { NextConfig } from "next";

// Local Supabase (`npm run db:start`) serves storage from 127.0.0.1:54321.
// Next 16 also refuses to optimize local-IP images unless explicitly allowed,
// so both are enabled in dev only.
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(isDev
        ? [
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "54321",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
    dangerouslyAllowLocalIP: isDev,
  },
};

export default nextConfig;
