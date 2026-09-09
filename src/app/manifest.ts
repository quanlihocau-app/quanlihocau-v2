import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Quản Lí Hồ Câu - POS Hồ Câu",
        short_name: "Hồ Câu POS",
        description: "Phần mềm quản lý và vận hành hồ câu dịch vụ chuyên nghiệp",
        start_url: "/sessions",
        id: "/sessions",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#082618",
        theme_color: "#082618",
        lang: "vi",
        dir: "ltr",
        categories: ["business", "productivity", "utilities"],
        icons: [
            {
                src: "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-maskable-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-maskable-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
        shortcuts: [
            {
                name: "Tạo vé mới",
                short_name: "Tạo vé",
                description: "Mở vé câu hoặc bán lẻ nhanh cho khách",
                url: "/sessions/new",
                icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
            },
            {
                name: "Danh sách đang câu",
                short_name: "Đang câu",
                description: "Xem các ô và cần thủ đang câu",
                url: "/sessions",
                icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
            },
            {
                name: "Báo cáo doanh thu",
                short_name: "Báo cáo",
                description: "Báo cáo doanh thu và chốt ca",
                url: "/reports",
                icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
            },
        ],
    };
}
