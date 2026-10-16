import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: "https://quanlihocau.com",
            // Keep lastModified tied to content changes, not each build/deploy.
            lastModified: new Date("2026-10-13"),
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: "https://quanlihocau.com/bang-gia",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: "https://quanlihocau.com/thiet-bi-may-in",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: "https://quanlihocau.com/register",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: "https://quanlihocau.com/login",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: "https://quanlihocau.com/dieu-khoan",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: "https://quanlihocau.com/chinh-sach-bao-mat",
            lastModified: new Date("2026-10-13"),
            changeFrequency: "monthly",
            priority: 0.5,
        },
    ];
}
