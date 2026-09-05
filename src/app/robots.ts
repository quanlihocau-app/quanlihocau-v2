import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/",
                "/dashboard",
                "/settings",
                "/settings/",
                "/sessions",
                "/sessions/",
                "/invoices",
                "/invoices/",
                "/reports/",
                "/inventory",
                "/expenses",
                "/facilities",
                "/fish-types",
                "/fish-buybacks",
                "/customers",
                "/pricing",
                "/products",
            ],
        },
        sitemap: "https://quanlihocau.com/sitemap.xml",
    };
}
