import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    images: {
        formats: ["image/avif", "image/webp"],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
    },
    experimental: {
        optimizePackageImports: [
            "@prisma/client",
            "next-auth",
            "zod",
            "bcryptjs",
            "@tanstack/react-query",
            "sonner",
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                ],
            },
            {
                source: "/images/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                source: "/icons/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                source: "/:path*.(ico|png|svg|jpg|jpeg|webp|avif|woff2|woff)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;

