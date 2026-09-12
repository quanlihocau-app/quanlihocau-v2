"use client";

import React from "react";

export function MobileContactBar() {
    return (
        <aside
            aria-label="Thanh liên hệ nhanh"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 10px)" }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[#1C4D32] bg-[#071D12]/95 backdrop-blur-md px-3 pt-2.5 pb-2 shadow-2xl print:hidden"
        >
            <div className="mx-auto flex max-w-md items-center justify-between gap-2.5">
                {/* Nút Gọi ngay */}
                <a
                    href="tel:0855550813"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#246B38] px-3 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                        />
                    </svg>
                    <span>Gọi ngay</span>
                </a>

                {/* Nút Nhắn Zalo */}
                <a
                    href="https://zalo.me/0855550813"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0068FF] px-3 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all"
                >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-[#0068FF]">
                        Z
                    </span>
                    <span>Nhắn Zalo</span>
                </a>
            </div>
        </aside>
    );
}
