"use client";

import React, { useState } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { getQueryClient, createLocalStoragePersister } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
    // Đảm bảo queryClient và persister là instance ổn định trên Client
    const [queryClient] = useState(() => getQueryClient());
    const [persister] = useState(() => createLocalStoragePersister());

    // Nếu môi trường server hoặc persister chưa khởi tạo, fallback về QueryClientProvider
    if (!persister) {
        return (
            <ToastProvider>
                {children}
            </ToastProvider>
        );
    }

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24, // Giữ cache 24 giờ trong LocalStorage
                buster: "v1.0.0",
            }}
        >
            <ToastProvider>
                {children}
            </ToastProvider>
        </PersistQueryClientProvider>
    );
}
