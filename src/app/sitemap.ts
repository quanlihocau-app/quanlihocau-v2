import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        {
            url: "https://quanlihocau.com",
            lastModified: now,
            changeFrequency: "daily",
            priority: 1.0,
        },
        {
            url: "https://quanlihocau.com/bang-gia",
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: "https://quanlihocau.com/thiet-bi-may-in",
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: "https://quanlihocau.com/register",
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: "https://quanlihocau.com/login",
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: "https://quanlihocau.com/dieu-khoan",
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: "https://quanlihocau.com/chinh-sach-bao-mat",
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.5,
        },
    ];
}
