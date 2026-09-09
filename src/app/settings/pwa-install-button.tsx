"use client";

import { openPwaInstallGuide } from "@/components/pwa/pwa-install-prompt";

export function PwaInstallSettingRow() {
    return (
        <button
            type="button"
            onClick={() => openPwaInstallGuide()}
            className="menu-row w-full text-left cursor-pointer flex items-center justify-between"
        >
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F3E5] text-[#246B38] text-base">
                    📲
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[#17201A]">
                            Cài đặt ra Màn hình chính
                        </p>
                        <span className="rounded-full bg-[#E8F3E5] px-2 py-0.5 text-[10px] font-bold text-[#246B38]">
                            App Mode
                        </span>
                    </div>
                    <p className="text-[12px] text-[#66716A] mt-0.5">
                        Dùng toàn màn hình như ứng dụng điện thoại, không dính thanh địa chỉ
                    </p>
                </div>
            </div>
            <svg
                className="h-4 w-4 shrink-0 text-[#8A938D]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
        </button>
    );
}
