"use client";

import { openAppTour } from "@/components/tour/app-tour";

/**
 * A settings row button that re-opens the onboarding tour.
 * Drop this anywhere in the settings page.
 */
export function TourSettingsRow() {
    return (
        <button
            type="button"
            onClick={() => openAppTour()}
            className="menu-row w-full text-left bg-[#E8F3E5]/60 border-[#4F9D5A]/40 hover:bg-[#E8F3E5] cursor-pointer"
        >
            <div>
                <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#4F9D5A] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        MỚI
                    </span>
                    <p className="text-[14px] font-bold text-[#246B38]">
                        Xem lại hướng dẫn sử dụng
                    </p>
                </div>
                <p className="text-[12px] text-[#66716A] mt-0.5">
                    Tour từng bước · Bắt đầu lại từ đầu bất cứ lúc nào
                </p>
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
