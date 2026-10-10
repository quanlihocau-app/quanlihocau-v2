"use client";

import React, { useEffect, useRef, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient, clearCatalogCache } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/toast";
import { AutoScrollCenter } from "@/components/ui/auto-scroll-center";
import { VirtualKeyboardHandler } from "@/components/ui/virtual-keyboard-handler";

function SessionCacheGuard() {
    const { data: session, status } = useSession();
    const previousIdentity = useRef<string | null | undefined>(undefined);
    useEffect(() => {
        if (status === "loading") return;
        const identity = session?.user?.id ?? null;
        if (previousIdentity.current !== undefined && previousIdentity.current !== identity) {
            clearCatalogCache();
        }
        previousIdentity.current = identity;
        try { window.localStorage.removeItem("QLHC_POS_CACHE_V1"); } catch { /* Storage is optional. */ }
    }, [session?.user?.id, status]);
    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    // Stable client for both server rendering and browser hydration.
    const [queryClient] = useState(() => getQueryClient());

    const content = (
        <ToastProvider>
            <AutoScrollCenter />
            <VirtualKeyboardHandler />
            {children}
        </ToastProvider>
    );

    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                <SessionCacheGuard />
                {content}
            </QueryClientProvider>
        </SessionProvider>
    );
}
