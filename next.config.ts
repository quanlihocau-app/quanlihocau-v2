import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    experimental: {
        optimizePackageImports: [
            "@prisma/client",
            "next-auth",
            "zod",
            "bcryptjs",
        ],
    },
};

export default nextConfig;

