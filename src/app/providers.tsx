"use client";

import React, { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { getQueryClient, createLocalStoragePersister } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/toast";
import { AutoScrollCenter } from "@/components/ui/auto-scroll-center";

export function Providers({ children }: { children: React.ReactNode }) {
    // Đảm bảo queryClient và persister là instance ổn định trên Client
    const [queryClient] = useState(() => getQueryClient());
    const [persister] = useState(() => createLocalStoragePersister());

    const content = (
        <ToastProvider>
            <AutoScrollCenter />
            {children}
        </ToastProvider>
    );

    // Nếu môi trường server hoặc persister chưa khởi tạo, fallback về SessionProvider + content
    if (!persister) {
        return (
            <SessionProvider>
                {content}
            </SessionProvider>
        );
    }

    return (
        <SessionProvider>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                    persister,
                    maxAge: 1000 * 60 * 60 * 24, // Giữ cache 24 giờ trong LocalStorage
                    buster: "v1.0.0",
                }}
            >
                {content}
            </PersistQueryClientProvider>
        </SessionProvider>
    );
}
