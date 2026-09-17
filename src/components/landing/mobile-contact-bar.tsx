"use client";

import React from "react";
import Link from "next/link";

interface MobileContactBarProps {
    isLoggedIn?: boolean;
}

export function MobileContactBar({ isLoggedIn = false }: MobileContactBarProps) {
    return (
        <aside
            aria-label="Thanh thao tác nhanh trên điện thoại"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 10px)" }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[#1C4D32] bg-[#071D12]/95 backdrop-blur-md px-3 pt-2.5 pb-2 shadow-2xl print:hidden"
        >
            <div className="mx-auto flex max-w-md items-center justify-between gap-2">
                {isLoggedIn ? (
                    <Link
                        href="/sessions"
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F9D5A] px-4 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all"
                    >
                        <span>Vào quầy thu ngân</span>
                        <span>→</span>
                    </Link>
                ) : (
                    <>
                        {/* Nút Đăng nhập */}
                        <Link
                            href="/login"
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#246B38] bg-[#0C2E1F] px-3.5 py-2.5 text-xs font-bold text-[#D5E5D1] hover:text-white active:scale-95 transition-all"
                        >
                            Đăng nhập
                        </Link>

                        {/* Nút Dùng thử miễn phí (CTA chính) */}
                        <Link
                            href="/register"
                            className="flex-1 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#4F9D5A] px-3 py-2.5 text-xs font-black text-white shadow-lg shadow-[#4F9D5A]/30 active:scale-95 transition-all text-center"
                        >
                            <span>Dùng thử miễn phí</span>
                            <span>→</span>
                        </Link>
                    </>
                )}

                {/* Nút Nhắn Zalo / Tư vấn */}
                <a
                    href="https://zalo.me/0855550813"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0068FF] text-white shadow-md active:scale-95 transition-all"
                    aria-label="Liên hệ Zalo tư vấn: 0855 550 813"
                    title="Nhắn Zalo: 0855 550 813"
                >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#0068FF]">
                        Z
                    </span>
                </a>
            </div>
        </aside>
    );
}
