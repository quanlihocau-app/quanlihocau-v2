"use client";

import { PageRecovery } from "@/components/ui/page-recovery";

export default function GlobalError({ retry }: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    return (
        <html lang="vi">
            <head>
                <title>Không thể tải trang | Quản Lý Hồ Câu</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="noindex, nofollow" />
            </head>
            <body style={{ margin: 0 }}>
                <PageRecovery retry={retry} />
            </body>
        </html>
    );
}
